package com.trevorism.service

import com.trevorism.data.Repository
import com.trevorism.https.SecureHttpClient
import com.trevorism.model.RegisterUserRequest
import com.trevorism.model.RegisteredUser
import com.trevorism.model.User
import com.trevorism.secure.Roles
import groovy.json.JsonSlurper
import io.micronaut.security.authentication.Authentication
import org.junit.jupiter.api.Test

import java.lang.reflect.Field

import static org.junit.jupiter.api.Assertions.assertThrows

class DefaultAdminUserServiceTest {

    private static CallerContext caller(String role, String tenant) {
        Authentication authentication = [getName   : { "caller" },
                                         getRoles  : { [role] },
                                         getAttributes: { tenant ? [tenant: tenant] : [:] }] as Authentication
        return CallerContext.from(authentication)
    }

    private static DefaultAdminUserService service(Map handlers, List<User> allTenantUsers = []) {
        SecureHttpClient client = [
                get   : { String url -> handlers["get"] ? handlers["get"].call(url) : "[]" },
                post  : { String url, String body -> handlers["post"] ? handlers["post"].call(url, body) : "true" },
                delete: { String url -> handlers["delete"] ? handlers["delete"].call(url) : "true" }
        ] as SecureHttpClient

        DefaultAdminUserService svc = new DefaultAdminUserService(client, client)
        Field field = DefaultAdminUserService.getDeclaredField("allTenantsRepository")
        field.setAccessible(true)
        field.set(svc, [all: { allTenantUsers }] as Repository)
        return svc
    }

    @Test
    void testTenantAdminListsThroughTheCallersOwnToken() {
        String requested = null
        def svc = service([get: { String url -> requested = url; '[{"username":"alice","active":true}]' }])

        List<User> users = svc.listUsers(caller(Roles.TENANT_ADMIN, "t1"))

        assert requested == "https://auth.trevorism.com/user/"
        assert users*.username == ["alice"]
    }

    @Test
    void testGlobalAdminListsAcrossEveryTenant() {
        boolean calledAuthProvider = false
        def svc = service([get: { String url -> calledAuthProvider = true; "[]" }],
                [new User(username: "alice", tenantId: "a"), new User(username: "bob", tenantId: "b")])

        List<User> users = svc.listUsers(caller(Roles.ADMIN, null))

        assert !calledAuthProvider
        assert users*.tenantId == ["a", "b"]
    }

    @Test
    void testAPlainUserIsRefusedBeforeAnyDownstreamCall() {
        boolean called = false
        def svc = service([get: { String url -> called = true; "[]" }])

        def thrown = assertThrows(DownstreamException) { svc.listUsers(caller(Roles.USER, "t1")) }

        assert thrown.status == 403
        assert !called
    }

    @Test
    void testASystemIdentityIsRefused() {
        def svc = service([:])

        assert assertThrows(DownstreamException) { svc.listUsers(caller(Roles.SYSTEM, null)) }.status == 403
    }

    @Test
    void testApproveWithNoExplicitFlagPreservesExistingAdministratorAccess() {
        String body = null
        def svc = service([post: { String url, String posted -> body = posted; "true" }],
                [new User(username: "alice", admin: true, active: false)])

        svc.approve("alice", null, caller(Roles.ADMIN, null))

        assert new JsonSlurper().parseText(body).isAdmin == true
    }

    @Test
    void testApproveWithNoExplicitFlagLeavesANonAdminAsANonAdmin() {
        String body = null
        def svc = service([post: { String url, String posted -> body = posted; "true" }],
                [new User(username: "alice", admin: false, active: false)])

        svc.approve("alice", null, caller(Roles.ADMIN, null))

        assert new JsonSlurper().parseText(body).isAdmin == false
    }

    @Test
    void testTenantAdminCannotGrantAdministratorAccess() {
        boolean posted = false
        def svc = service([get : { '[{"username":"alice","admin":false}]' },
                           post: { String url, String body -> posted = true; "true" }])

        def thrown = assertThrows(DownstreamException) { svc.approve("alice", true, caller(Roles.TENANT_ADMIN, "t1")) }

        assert thrown.status == 403
        assert !posted
    }

    @Test
    void testTenantAdminApprovalIsPinnedToTheirOwnTenant() {
        String body = null
        def svc = service([get : { '[{"username":"alice","tenantGuid":"t1"}]' },
                           post: { String url, String posted -> body = posted; "true" }])

        svc.approve("alice", false, caller(Roles.TENANT_ADMIN, "t1"))

        assert new JsonSlurper().parseText(body).tenantGuid == "t1"
    }

    @Test
    void testGlobalAdminApprovalTargetsTheUsersOwnTenant() {
        String body = null
        def svc = service([post: { String url, String posted -> body = posted; "true" }],
                [new User(username: "alice", tenantId: "namespace-b")])

        svc.approve("alice", false, caller(Roles.ADMIN, null))

        assert new JsonSlurper().parseText(body).tenantGuid == "namespace-b"
    }

    @Test
    void testApproveRejectsAnUnknownUserWithoutCallingDownstream() {
        boolean posted = false
        def svc = service([get : { "[]" }, post: { String url, String body -> posted = true; "true" }])

        def thrown = assertThrows(DownstreamException) { svc.approve("ghost", false, caller(Roles.ADMIN, null)) }

        assert thrown.status == 404
        assert !posted
    }

    @Test
    void testApproveRequiresAUsername() {
        def svc = service([:])

        assert assertThrows(DownstreamException) { svc.approve("  ", false, caller(Roles.ADMIN, null)) }.status == 400
    }

    @Test
    void testDeactivatePostsToTheDeactivateEndpoint() {
        String requested = null
        def svc = service([get : { '[{"username":"alice","active":true}]' },
                           post: { String url, String body -> requested = url; "true" }])

        svc.deactivate("alice", caller(Roles.TENANT_ADMIN, "t1"))

        assert requested == "https://auth.trevorism.com/user/deactivate"
    }

    @Test
    void testUpdatePermissionsSendsTheRequestedString() {
        String body = null
        def svc = service([get : { '[{"username":"alice","tenantGuid":"t1"}]' },
                           post: { String url, String posted -> body = posted; "{}" }])

        svc.updatePermissions("alice", "CRUD", caller(Roles.TENANT_ADMIN, "t1"))

        def parsed = new JsonSlurper().parseText(body)
        assert parsed.permissions == "CRUD"
        assert parsed.username == "alice"
    }

    @Test
    void testUpdatePermissionsSendsAnEmptyStringWhenClearing() {
        String body = null
        def svc = service([post: { String url, String posted -> body = posted; "{}" }],
                [new User(username: "alice")])

        svc.updatePermissions("alice", null, caller(Roles.ADMIN, null))

        assert new JsonSlurper().parseText(body).permissions == ""
    }

    @Test
    void testDeleteRemovesAUserInTheCallersOwnTenant() {
        String requested = null
        def svc = service([get   : { '[{"username":"alice","tenantGuid":"t1"}]' },
                           delete: { String url -> requested = url; "true" }])

        svc.delete("alice", caller(Roles.TENANT_ADMIN, "t1"))

        assert requested == "https://auth.trevorism.com/user/alice"
    }

    @Test
    void testGlobalAdminCannotDeleteAUserThatLivesInAnotherTenant() {
        boolean deleted = false
        def svc = service([delete: { String url -> deleted = true; "true" }],
                [new User(username: "alice", tenantId: "namespace-b")])

        def thrown = assertThrows(DownstreamException) { svc.delete("alice", caller(Roles.ADMIN, null)) }

        assert thrown.status == 403
        assert !deleted
    }

    @Test
    void testGlobalAdminCanDeleteAUserInTheDefaultNamespace() {
        String requested = null
        def svc = service([delete: { String url -> requested = url; "true" }],
                [new User(username: "alice")])

        svc.delete("alice", caller(Roles.ADMIN, null))

        assert requested == "https://auth.trevorism.com/user/alice"
    }

    @Test
    void testUsernamesAreMatchedWithoutRegardToCase() {
        String body = null
        def svc = service([get : { '[{"username":"alice"}]' },
                           post: { String url, String posted -> body = posted; "true" }])

        svc.approve("ALICE", false, caller(Roles.TENANT_ADMIN, "t1"))

        assert new JsonSlurper().parseText(body).username == "alice"
    }

    @Test
    void testRegisterPostsToTheCallersOwnTenantAndReturnsTheGeneratedPassword() {
        String requested = null
        String body = null
        def svc = service([post: { String url, String posted -> requested = url; body = posted; "{}" }])

        RegisteredUser registered = svc.register(
                new RegisterUserRequest(username: "Alice", email: "Alice@Trevorism.com", permissions: "CR"),
                caller(Roles.TENANT_ADMIN, "t1"))

        assert requested == "https://auth.trevorism.com/user/"
        def sent = new JsonSlurper().parseText(body)
        assert sent.username == "alice"
        assert sent.email == "alice@trevorism.com"
        assert sent.tenantGuid == "t1"
        assert sent.permissions == "CR"
        assert registered.username == "alice"
        assert registered.password == sent.password
        assert registered.password
    }

    @Test
    void testRegisterLeavesTheUserPendingApproval() {
        String body = null
        def svc = service([post: { String url, String posted -> body = posted; "{}" }])

        svc.register(new RegisterUserRequest(username: "alice", email: "alice@trevorism.com"),
                caller(Roles.TENANT_ADMIN, "t1"))

        assert new JsonSlurper().parseText(body).autoRegister == false
    }

    @Test
    void testRegisterNeverCallsActivate() {
        List<String> posted = []
        def svc = service([post: { String url, String body -> posted << url; "{}" }])

        svc.register(new RegisterUserRequest(username: "alice", email: "alice@trevorism.com"),
                caller(Roles.TENANT_ADMIN, "t1"))

        assert posted == ["https://auth.trevorism.com/user/"]
    }

    @Test
    void testEachRegistrationGeneratesADifferentPassword() {
        def svc = service([post: { String url, String body -> "{}" }])
        def request = new RegisterUserRequest(username: "alice", email: "alice@trevorism.com")

        String first = svc.register(request, caller(Roles.TENANT_ADMIN, "t1")).password
        String second = svc.register(request, caller(Roles.TENANT_ADMIN, "t1")).password

        assert first != second
        assert first.length() >= 6
    }

    @Test
    void testRegisterRefusesAShortUsernameBeforeAnyDownstreamCall() {
        boolean called = false
        def svc = service([post: { String url, String body -> called = true; "{}" }])

        def thrown = assertThrows(DownstreamException) {
            svc.register(new RegisterUserRequest(username: "ab", email: "ab@trevorism.com"),
                    caller(Roles.TENANT_ADMIN, "t1"))
        }

        assert thrown.status == 400
        assert !called
    }

    @Test
    void testRegisterRefusesAnAddressThatIsNotAnEmail() {
        boolean called = false
        def svc = service([post: { String url, String body -> called = true; "{}" }])

        def thrown = assertThrows(DownstreamException) {
            svc.register(new RegisterUserRequest(username: "alice", email: "alice"),
                    caller(Roles.TENANT_ADMIN, "t1"))
        }

        assert thrown.status == 400
        assert !called
    }

    @Test
    void testRegisterIsRefusedForAPlainUser() {
        boolean called = false
        def svc = service([post: { String url, String body -> called = true; "{}" }])

        def thrown = assertThrows(DownstreamException) {
            svc.register(new RegisterUserRequest(username: "alice", email: "alice@trevorism.com"),
                    caller(Roles.USER, "t1"))
        }

        assert thrown.status == 403
        assert !called
    }
}
