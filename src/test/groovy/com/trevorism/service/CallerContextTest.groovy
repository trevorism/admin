package com.trevorism.service

import com.trevorism.secure.Roles
import io.micronaut.security.authentication.Authentication
import org.junit.jupiter.api.Test

class CallerContextTest {

    private static Authentication auth(String role, Map attributes, String name = "tbrooks") {
        [getName: { name }, getRoles: { role ? [role] : [] }, getAttributes: { attributes }] as Authentication
    }

    @Test
    void testGlobalAdminHasNoTenantAndMayManageTenants() {
        CallerContext caller = CallerContext.from(auth(Roles.ADMIN, [:]))

        assert caller.isGlobalAdmin()
        assert !caller.isTenantAdmin()
        assert caller.canAdminister()
        assert caller.canManageTenants()
        assert caller.tenant == null
    }

    @Test
    void testTenantAdminMayAdministerButNotManageTenants() {
        CallerContext caller = CallerContext.from(auth(Roles.TENANT_ADMIN, [tenant: "t1"]))

        assert !caller.isGlobalAdmin()
        assert caller.isTenantAdmin()
        assert caller.canAdminister()
        assert !caller.canManageTenants()
        assert caller.tenant == "t1"
    }

    @Test
    void testPlainUserMayNotAdminister() {
        CallerContext caller = CallerContext.from(auth(Roles.USER, [tenant: "t1"]))

        assert !caller.canAdminister()
        assert !caller.canManageTenants()
    }

    @Test
    void testSystemIdentityMayNotAdminister() {
        CallerContext caller = CallerContext.from(auth(Roles.SYSTEM, [:]))

        assert !caller.canAdminister()
        assert !caller.canManageTenants()
    }

    @Test
    void testInternalIdentityMayNotAdminister() {
        assert !CallerContext.from(auth(Roles.INTERNAL, [:])).canAdminister()
    }

    @Test
    void testMissingAuthenticationIsNotAnAdministrator() {
        CallerContext caller = CallerContext.from(null)

        assert !caller.canAdminister()
        assert caller.username == null
        assert caller.role == null
    }

    @Test
    void testEmptyRolesIsNotAnAdministrator() {
        CallerContext caller = CallerContext.from(auth(null, [:]))

        assert !caller.canAdminister()
        assert caller.role == null
    }

    @Test
    void testUsernameComesFromTheSubject() {
        assert CallerContext.from(auth(Roles.ADMIN, [:], "alice")).username == "alice"
    }
}
