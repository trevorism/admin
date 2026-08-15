package com.trevorism.service

import com.trevorism.model.App
import com.trevorism.model.Tenant
import com.trevorism.model.User
import groovy.json.JsonSlurper

import java.text.SimpleDateFormat

class Mappers {

    private static final String ISO_FORMAT = "yyyy-MM-dd'T'HH:mm:ss'Z'"

    static Object parse(String json) {
        if (!json?.trim()) {
            return null
        }
        try {
            return new JsonSlurper().parseText(json)
        } catch (Exception ignored) {
            return null
        }
    }

    static List<Map> toMapList(Object parsed) {
        if (!(parsed instanceof List)) {
            return []
        }
        return parsed.findAll { it instanceof Map } as List<Map>
    }

    static List<User> toUsers(Object parsed) {
        return toMapList(parsed).collect { toUser(it) }.findAll()
    }

    static User toUser(Map raw) {
        if (!raw?.username) {
            return null
        }
        return new User(
                id: string(raw.id),
                username: string(raw.username),
                email: string(raw.email),
                image: string(raw.image),
                admin: bool(raw.admin),
                active: bool(raw.active),
                tenantGuid: string(raw.tenantGuid),
                tenantId: string(raw.tenantId),
                permissions: string(raw.permissions),
                dateCreated: date(raw.dateCreated),
                dateExpired: date(raw.dateExpired))
    }

    static List<App> toApps(Object parsed) {
        return toMapList(parsed).collect { toApp(it) }.findAll()
    }

    static App toApp(Map raw) {
        if (!raw?.appName && !raw?.clientId) {
            return null
        }
        return new App(
                id: string(raw.id),
                appName: string(raw.appName),
                clientId: string(raw.clientId),
                replyUrls: strings(raw.replyUrls),
                logoutUrls: strings(raw.logoutUrls),
                tenantGuid: string(raw.tenantGuid),
                tenantId: string(raw.tenantId),
                permissions: string(raw.permissions),
                active: bool(raw.active),
                dateCreated: date(raw.dateCreated),
                dateExpired: date(raw.dateExpired))
    }

    static List<Tenant> toTenants(Object parsed) {
        return toMapList(parsed).collect { toTenant(it) }.findAll()
    }

    static Tenant toTenant(Map raw) {
        if (!raw?.guid && !raw?.name) {
            return null
        }
        return new Tenant(
                id: string(raw.id),
                name: string(raw.name),
                domain: string(raw.domain),
                guid: string(raw.guid))
    }

    static String isoDate(Date date) {
        return date ? new SimpleDateFormat(ISO_FORMAT).format(date) : null
    }

    private static List<String> strings(Object raw) {
        if (!(raw instanceof List)) {
            return []
        }
        return raw.collect { string(it) }.findAll()
    }

    private static String string(Object raw) {
        if (raw == null) {
            return null
        }
        String value = raw.toString().trim()
        return value ?: null
    }

    private static boolean bool(Object raw) {
        if (raw instanceof Boolean) {
            return raw
        }
        return raw?.toString()?.equalsIgnoreCase("true")
    }

    private static Date date(Object raw) {
        if (raw instanceof Date) {
            return raw
        }
        if (raw instanceof Number) {
            return new Date(raw.longValue())
        }
        String value = string(raw)
        if (!value) {
            return null
        }
        for (String pattern in ["yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", ISO_FORMAT, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                                "yyyy-MM-dd'T'HH:mm:ssXXX", "MMM d, yyyy, h:mm:ss a", "yyyy-MM-dd"]) {
            try {
                return new SimpleDateFormat(pattern).parse(value)
            } catch (Exception ignored) {
            }
        }
        return null
    }
}
