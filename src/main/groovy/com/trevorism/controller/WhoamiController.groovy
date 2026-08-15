package com.trevorism.controller

import com.trevorism.model.Whoami
import com.trevorism.secure.Roles
import com.trevorism.secure.Secure
import com.trevorism.service.CallerContext
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.security.authentication.Authentication
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag

@Controller("/api/whoami")
class WhoamiController {

    @Tag(name = "Whoami Operations")
    @Operation(summary = "Describes the calling user and what they may administer **Secure")
    @Get(value = "/", produces = MediaType.APPLICATION_JSON)
    @Secure(Roles.USER)
    Whoami whoami(Authentication authentication) {
        CallerContext caller = CallerContext.from(authentication)
        return new Whoami(
                username: caller.username,
                role: caller.role,
                tenant: caller.tenant,
                globalAdmin: caller.isGlobalAdmin(),
                tenantAdmin: caller.isTenantAdmin(),
                canAdminister: caller.canAdminister(),
                canManageTenants: caller.canManageTenants())
    }
}
