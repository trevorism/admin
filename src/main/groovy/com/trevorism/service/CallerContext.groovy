package com.trevorism.service

import com.trevorism.secure.Roles
import io.micronaut.security.authentication.Authentication

class CallerContext {

    private static final String TENANT_CLAIM = "tenant"

    String username
    String role
    String tenant

    static CallerContext from(Authentication authentication) {
        if (!authentication) {
            return new CallerContext()
        }
        return new CallerContext(
                username: authentication.name,
                role: authentication.roles ? authentication.roles.first().toString() : null,
                tenant: authentication.attributes?.get(TENANT_CLAIM) as String)
    }

    boolean isGlobalAdmin() {
        return role == Roles.ADMIN
    }

    boolean isTenantAdmin() {
        return role == Roles.TENANT_ADMIN
    }

    boolean canAdminister() {
        return isGlobalAdmin() || isTenantAdmin()
    }

    boolean canManageTenants() {
        return isGlobalAdmin()
    }
}
