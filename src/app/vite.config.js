import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from "@tailwindcss/vite";
import fs from 'node:fs'
import zlib from 'node:zlib'
import axios from 'axios'

const SECRETS_PATH = '../main/resources/secrets.properties'
const TOKEN_URL = 'https://auth.trevorism.com/token'
const TOKEN_REFRESH_MS = 10 * 60 * 1000
const IDENTITY_COOKIE_MAX_AGE_SECONDS = 15 * 60

function readProperties(path) {
    const out = {}
    const raw = fs.readFileSync(path, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
            continue
        }
        const separator = trimmed.indexOf('=')
        if (separator === -1) {
            continue
        }
        out[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
    }
    return out
}

let token = ''
let credentials = null

// This console rejects role `system`, so clientId/clientSecret are useless here:
// an app identity authenticates against the App registry and every tab would 403.
// Local development needs a real Trevorism user, requested with type "user".
function readLocalCredentials() {
    const fromEnv = {
        id: process.env.TREVORISM_LOCAL_USER,
        password: process.env.TREVORISM_LOCAL_PASSWORD
    }
    if (fromEnv.id && fromEnv.password) {
        return {...fromEnv, type: 'user', source: 'environment'}
    }
    try {
        const properties = readProperties(SECRETS_PATH)
        if (properties.localUser && properties.localPassword) {
            return {
                id: properties.localUser,
                password: properties.localPassword,
                type: 'user',
                source: 'secrets.properties'
            }
        }
    } catch (e) {
        console.warn('[proxy-auth] Could not read secrets.properties:', e.message)
    }
    return null
}

credentials = readLocalCredentials()

if (process.env.VITEST) {
    // Nothing here is used under test, and the guidance below is only noise in CI.
} else if (credentials) {
    console.log(`[proxy-auth] Using local credentials from ${credentials.source}`)
} else {
    console.warn('[proxy-auth] No local user credentials found, so every /api call will 401.')
    console.warn('[proxy-auth] Set TREVORISM_LOCAL_USER and TREVORISM_LOCAL_PASSWORD, or add')
    console.warn('[proxy-auth] localUser/localPassword to src/main/resources/secrets.properties.')
    console.warn('[proxy-auth] These must be a real Trevorism user. clientId/clientSecret will not')
    console.warn('[proxy-auth] work: an app identity has role "system", and this console requires')
    console.warn('[proxy-auth] admin or tenant_admin.')
}

function describeToken(jwt) {
    try {
        const payload = jwt.split('.')[1]
        let decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
        try {
            decoded = zlib.gunzipSync(decoded)
        } catch {
            // Tokens are GZIP compressed today, but tolerate an uncompressed payload.
        }
        return JSON.parse(decoded.toString('utf8'))
    } catch {
        return null
    }
}

function reportIdentity(jwt) {
    const claims = describeToken(jwt)
    if (!claims) {
        console.log('[proxy-auth] Obtained a session token')
        return
    }
    const role = claims.role || 'unknown'
    const tenant = claims.tenant ? ` tenant=${claims.tenant}` : ' (no tenant, global scope)'
    console.log(`[proxy-auth] Signed in as ${claims.sub || credentials?.id} role=${role}${tenant}`)
    if (role !== 'admin' && role !== 'tenant_admin') {
        console.warn(`[proxy-auth] Role "${role}" cannot administer anything; the console will show Access Denied.`)
    }
}

async function fetchToken() {
    if (!credentials) {
        return ''
    }
    try {
        const {id, password, type} = credentials
        const response = await axios.post(TOKEN_URL, {id, password, type})
        const fetched = typeof response.data === 'string' ? response.data.trim() : ''
        if (!fetched) {
            console.warn('[proxy-auth] Token endpoint returned an empty token')
            return ''
        }
        reportIdentity(fetched)
        return fetched
    } catch (err) {
        const status = err.response?.status
        console.warn('[proxy-auth] Failed to obtain token', status ? `(HTTP ${status})` : '', err.message)
        return ''
    }
}

let refreshing = null

async function refreshToken() {
    if (!refreshing) {
        refreshing = fetchToken().then((fetched) => {
            if (fetched) {
                token = fetched
            }
            refreshing = null
            return token
        })
    }
    return refreshing
}

// Browser-readable, so the router guard sees a signed-in user. The real
// authorization still comes from the session token injected below.
function identityCookie() {
    const name = credentials?.id || 'local'
    return `user_name=${encodeURIComponent(name)}; Path=/; Max-Age=${IDENTITY_COOKIE_MAX_AGE_SECONDS}`
}

function proxyAuthPlugin() {
    return {
        name: 'proxy-auth',
        apply: 'serve',
        async configureServer(server) {
            if (process.env.VITEST) {
                return
            }
            server.middlewares.use((req, res, next) => {
                if (req.url?.startsWith('/api/refresh')) {
                    refreshToken()
                    res.setHeader('Set-Cookie', identityCookie())
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({status: 'refreshed'}))
                    return
                }
                if (!req.url?.startsWith('/api')) {
                    res.setHeader('Set-Cookie', identityCookie())
                }
                next()
            })
            await refreshToken()
            const timer = setInterval(refreshToken, TOKEN_REFRESH_MS)
            timer.unref?.()
        }
    }
}

export default defineConfig({
    plugins: [tailwindcss(), vue(), proxyAuthPlugin()],
    server: {
        host: "localhost",
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8080/',
                changeOrigin: true,
                secure: false,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.log('proxy error', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        console.log('Sending Request to the Target:', req.method, req.url);
                        if (token) {
                            proxyReq.setHeader('Cookie', `session=${token}`)
                        } else {
                            console.warn('[proxy-auth] No session token available for', req.url)
                            refreshToken()
                        }
                    });
                    proxy.on('proxyRes', (proxyRes, req, _res) => {
                        console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
                        if (proxyRes.statusCode === 401) {
                            console.warn('[proxy-auth] Backend returned 401; refreshing token for next request')
                            token = ''
                            refreshToken()
                        }
                    });
                }
            }
        }
    }
})
