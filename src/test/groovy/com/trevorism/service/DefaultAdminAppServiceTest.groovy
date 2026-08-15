package com.trevorism.service

import com.trevorism.data.Repository
import com.trevorism.https.SecureHttpClient
import com.trevorism.model.App
import com.trevorism.model.RegisterAppRequest
import com.trevorism.model.RegisteredApp
import com.trevorism.secure.Roles
import groovy.json.JsonSlurper
import io.micronaut.security.authentication.Authentication
import org.junit.jupiter.api.Test

import java.lang.reflect.Field

import static org.junit.jupiter.api.Assertions.assertThrows

class DefaultAdminAppServiceTest {

    private static CallerContext caller(String role, String tenant) {
        Authentication authentication = [getName      : { "caller" },
                                         getRoles     : { [role] },
                                         getAttributes: { tenant ? [tenant: tenant] : [:] }] as Authentication
        return CallerContext.from(authentication)
    }

    private static DefaultAdminAppService service(Map handlers, List<App> allTenantApps = []) {
        SecureHttpClient client = [
                get   : { String url -> handlers["get"] ? handlers["get"].call(url) : "[]" },
                post  : { String url, String body -> handlers["post"] ? handlers["post"].call(url, body) : "{}" },
                put   : { String url, String body -> handlers["put"] ? handlers["put"].call(url, body) : "secret" },
                delete: { String url -> handlers["delete"] ? handlers["delete"].call(url) : "true" }
        ] as SecureHttpClient

        DefaultAdminAppService svc = new DefaultAdminAppService(client, client)
        Field field = DefaultAdminAppService.getDeclaredField("allTenantsRepository")
        field.setAccessible(true)
        field.set(svc, [all: { allTenantApps }] as Repository)
        return svc
    }

    @Test
    void testTenantAdminListsThroughTheCallersOwnToken() {
        String requested = null
        def svc = service([get: { String url -> requested = url; '[{"appName":"widget","clientId":"c1"}]' }])

        List<App> apps = svc.listApps(caller(Roles.TENANT_ADMIN, "t1"))

        assert requested == "https://auth.trevorism.com/app/"
        assert apps*.appName == ["widget"]
    }

    @Test
    void testGlobalAdminListsAcrossEveryTenant() {
        def svc = service([:], [new App(appName: "a", tenantId: "x"), new App(appName: "b", tenantId: "y")])

        assert svc.listApps(caller(Roles.ADMIN, null))*.tenantId == ["x", "y"]
    }

    @Test
    void testAPlainUserIsRefused() {
        assert assertThrows(DownstreamException) { service([:]).listApps(caller(Roles.USER, "t1")) }.status == 403
    }

    @Test
    void testRegisterMintsASecretAndReturnsItExactlyOnce() {
        String secretUrl = null
        def svc = service([post: { String url, String body -> '{"appName":"widget","clientId":"c1"}' },
                           put : { String url, String body -> secretUrl = url; '"s3cret"' }])

        RegisteredApp registered = svc.register(new RegisterAppRequest(appName: "widget"), caller(Roles.TENANT_ADMIN, "t1"))

        assert secretUrl == "https://auth.trevorism.com/app/c1/secret"
        assert registered.clientSecret == "s3cret"
        assert registered.app.appName == "widget"
    }

    @Test
    void testRegisterSendsTheCallersOwnTenant() {
        String body = null
        def svc = service([post: { String url, String posted -> body = posted; '{"appName":"widget","clientId":"c1"}' }])

        svc.register(new RegisterAppRequest(appName: "widget"), caller(Roles.TENANT_ADMIN, "t1"))

        assert new JsonSlurper().parseText(body).tenantGuid == "t1"
    }

    @Test
    void testRegisterRequiresAnApplicationName() {
        def svc = service([:])

        assert assertThrows(DownstreamException) {
            svc.register(new RegisterAppRequest(appName: "  "), caller(Roles.ADMIN, null))
        }.status == 400
    }

    @Test
    void testRegisterFailsLoudlyWhenNoClientIdComesBack() {
        def svc = service([post: { String url, String body -> '{"appName":"widget"}' }])

        assert assertThrows(DownstreamException) {
            svc.register(new RegisterAppRequest(appName: "widget"), caller(Roles.ADMIN, null))
        }.status == 502
    }

    @Test
    void testRotateSecretStripsJsonQuoting() {
        def svc = service([get: { '[{"appName":"widget","clientId":"c1"}]' },
                           put: { String url, String body -> '"rotated"' }])

        assert svc.rotateSecret("c1", caller(Roles.TENANT_ADMIN, "t1")) == "rotated"
    }

    @Test
    void testRotateSecretAcceptsAnUnquotedSecret() {
        def svc = service([get: { '[{"appName":"widget","clientId":"c1"}]' },
                           put: { String url, String body -> "  rotated  " }])

        assert svc.rotateSecret("c1", caller(Roles.TENANT_ADMIN, "t1")) == "rotated"
    }

    @Test
    void testRotateSecretRejectsAnUnknownClientIdWithoutCallingDownstream() {
        boolean rotated = false
        def svc = service([get: { "[]" }, put: { String url, String body -> rotated = true; "x" }])

        assert assertThrows(DownstreamException) {
            svc.rotateSecret("missing", caller(Roles.TENANT_ADMIN, "t1"))
        }.status == 404
        assert !rotated
    }

    @Test
    void testDeleteRemovesAKnownApplication() {
        String requested = null
        def svc = service([get   : { '[{"appName":"widget","clientId":"c1","id":"7"}]' },
                           delete: { String url -> requested = url; "true" }])

        svc.delete("7", caller(Roles.TENANT_ADMIN, "t1"))

        assert requested == "https://auth.trevorism.com/app/7"
    }

    @Test
    void testDeleteRejectsAnUnknownApplication() {
        def svc = service([get: { "[]" }])

        assert assertThrows(DownstreamException) { svc.delete("7", caller(Roles.ADMIN, null)) }.status == 404
    }
}
