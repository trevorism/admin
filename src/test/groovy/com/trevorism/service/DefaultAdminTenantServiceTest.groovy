package com.trevorism.service

import com.trevorism.http.util.InvalidRequestException
import com.trevorism.https.SecureHttpClient
import com.trevorism.model.Tenant
import com.trevorism.secure.Roles
import groovy.json.JsonSlurper
import io.micronaut.security.authentication.Authentication
import org.junit.jupiter.api.Test

import static org.junit.jupiter.api.Assertions.assertThrows

class DefaultAdminTenantServiceTest {

    private static CallerContext caller(String role, String tenant) {
        Authentication authentication = [getName      : { "caller" },
                                         getRoles     : { [role] },
                                         getAttributes: { tenant ? [tenant: tenant] : [:] }] as Authentication
        return CallerContext.from(authentication)
    }

    private static DefaultAdminTenantService service(Map handlers) {
        SecureHttpClient client = [
                get : { String url -> handlers["get"] ? handlers["get"].call(url) : "[]" },
                post: { String url, String body -> handlers["post"] ? handlers["post"].call(url, body) : "{}" }
        ] as SecureHttpClient
        return new DefaultAdminTenantService(client)
    }

    @Test
    void testGlobalAdminListsEveryTenant() {
        String requested = null
        def svc = service([get: { String url -> requested = url; '[{"name":"Acme","guid":"g1"}]' }])

        List<Tenant> tenants = svc.listTenants(caller(Roles.ADMIN, null))

        assert requested == "https://tenant.auth.trevorism.com/tenant/"
        assert tenants*.name == ["Acme"]
    }

    @Test
    void testTenantAdminMayNotListEveryTenant() {
        boolean called = false
        def svc = service([get: { String url -> called = true; "[]" }])

        assert assertThrows(DownstreamException) { svc.listTenants(caller(Roles.TENANT_ADMIN, "t1")) }.status == 403
        assert !called
    }

    @Test
    void testTenantAdminReadsTheirOwnTenant() {
        String requested = null
        def svc = service([get: { String url -> requested = url; '{"name":"Acme","guid":"g1","domain":"acme.com"}' }])

        Tenant tenant = svc.currentTenant(caller(Roles.TENANT_ADMIN, "g1"))

        assert requested == "https://tenant.auth.trevorism.com/tenant/me"
        assert tenant.domain == "acme.com"
    }

    @Test
    void testAGlobalAdminHasNoOwnTenantSoNothingIsRequested() {
        boolean called = false
        def svc = service([get: { String url -> called = true; "{}" }])

        assert svc.currentTenant(caller(Roles.ADMIN, null)) == null
        assert !called
    }

    // Upstream answers 204 with no body when the caller carries no tenant claim.
    @Test
    void testAnEmptyBodyFromUpstreamReadsAsNoTenant() {
        def svc = service([get: { String url -> null }])

        assert svc.currentTenant(caller(Roles.TENANT_ADMIN, "g1")) == null
    }

    // Upstream answers 404 when the caller's guid matches no tenant record, which
    // the shared client turns into an InvalidRequestException carrying the status.
    @Test
    void testAnUnresolvableTenantGuidSurfacesAsNotFound() {
        def svc = service([get: { String url ->
            throw new InvalidRequestException(new RuntimeException("not found"), 404)
        }])

        assert assertThrows(DownstreamException) {
            svc.currentTenant(caller(Roles.TENANT_ADMIN, "ghost"))
        }.status == 404
    }

    @Test
    void testAPlainUserMayNotReadATenant() {
        assert assertThrows(DownstreamException) {
            service([:]).currentTenant(caller(Roles.USER, "t1"))
        }.status == 403
    }

    @Test
    void testCreateSendsTheNameAndDomain() {
        String body = null
        def svc = service([post: { String url, String posted -> body = posted; '{"name":"Acme","guid":"g1"}' }])

        Tenant created = svc.create("  Acme  ", " acme.com ", caller(Roles.ADMIN, null))

        def parsed = new JsonSlurper().parseText(body)
        assert parsed.name == "Acme"
        assert parsed.domain == "acme.com"
        assert created.guid == "g1"
    }

    @Test
    void testCreateRequiresAName() {
        assert assertThrows(DownstreamException) {
            service([:]).create("  ", "acme.com", caller(Roles.ADMIN, null))
        }.status == 400
    }

    @Test
    void testTenantAdminMayNotCreateATenant() {
        boolean called = false
        def svc = service([post: { String url, String body -> called = true; "{}" }])

        assert assertThrows(DownstreamException) {
            svc.create("Acme", "acme.com", caller(Roles.TENANT_ADMIN, "t1"))
        }.status == 403
        assert !called
    }
}
