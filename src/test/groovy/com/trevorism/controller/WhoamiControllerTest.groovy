package com.trevorism.controller

import com.trevorism.model.Whoami
import com.trevorism.secure.Roles
import io.micronaut.security.authentication.Authentication
import org.junit.jupiter.api.Test

class WhoamiControllerTest {

    private static Authentication auth(String role, Map attributes) {
        [getName: { "tbrooks" }, getRoles: { [role] }, getAttributes: { attributes }] as Authentication
    }

    @Test
    void testGlobalAdminMayAdministerEverything() {
        Whoami whoami = new WhoamiController().whoami(auth(Roles.ADMIN, [:]))

        assert whoami.globalAdmin
        assert whoami.canAdminister
        assert whoami.canManageTenants
        assert whoami.tenant == null
        assert whoami.username == "tbrooks"
    }

    @Test
    void testTenantAdminMayAdministerButNotManageTenants() {
        Whoami whoami = new WhoamiController().whoami(auth(Roles.TENANT_ADMIN, [tenant: "t1"]))

        assert whoami.tenantAdmin
        assert whoami.canAdminister
        assert !whoami.canManageTenants
        assert whoami.tenant == "t1"
    }

    @Test
    void testAPlainUserIsToldTheyMayNotAdminister() {
        Whoami whoami = new WhoamiController().whoami(auth(Roles.USER, [tenant: "t1"]))

        assert !whoami.canAdminister
        assert whoami.role == Roles.USER
    }

    @Test
    void testASystemIdentityMayNotAdminister() {
        assert !new WhoamiController().whoami(auth(Roles.SYSTEM, [:])).canAdminister
    }
}
