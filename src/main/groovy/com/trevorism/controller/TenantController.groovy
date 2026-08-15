package com.trevorism.controller

import com.trevorism.model.Tenant
import com.trevorism.secure.Roles
import com.trevorism.secure.Secure
import com.trevorism.service.AdminTenantService
import com.trevorism.service.CallerContext
import com.trevorism.service.DownstreamException
import io.micronaut.http.HttpResponse
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.security.authentication.Authentication
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.inject.Inject
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import static com.trevorism.service.Downstream.toClientStatus

@Controller("/api/tenant")
class TenantController {

    private static final Logger log = LoggerFactory.getLogger(TenantController)

    @Inject
    AdminTenantService adminTenantService

    @Tag(name = "Tenant Operations")
    @Operation(summary = "Lists every tenant **Secure")
    @Get(value = "/", produces = MediaType.APPLICATION_JSON)
    @Secure(Roles.ADMIN)
    HttpResponse<?> listTenants(Authentication authentication) {
        return respond("Unable to list tenants") {
            List<Tenant> tenants = adminTenantService.listTenants(CallerContext.from(authentication))
            HttpResponse.ok(tenants)
        }
    }

    @Tag(name = "Tenant Operations")
    @Operation(summary = "Returns the caller's own tenant **Secure")
    @Get(value = "/me", produces = MediaType.APPLICATION_JSON)
    @Secure(Roles.TENANT_ADMIN)
    HttpResponse<?> currentTenant(Authentication authentication) {
        return respond("Unable to load your tenant") {
            Tenant tenant = adminTenantService.currentTenant(CallerContext.from(authentication))
            tenant ? HttpResponse.ok(tenant) : HttpResponse.notFound([error: "You are not a member of a tenant"])
        }
    }

    @Tag(name = "Tenant Operations")
    @Operation(summary = "Creates a tenant **Secure")
    @Post(value = "/", produces = MediaType.APPLICATION_JSON, consumes = MediaType.APPLICATION_JSON)
    @Secure(Roles.ADMIN)
    HttpResponse<?> create(@Body Tenant request, Authentication authentication) {
        return respond("Unable to create the tenant") {
            Tenant created = adminTenantService.create(request?.name, request?.domain, CallerContext.from(authentication))
            HttpResponse.ok(created)
        }
    }

    private static HttpResponse<?> respond(String failureMessage, Closure<HttpResponse<?>> work) {
        try {
            return work.call()
        } catch (DownstreamException e) {
            return HttpResponse.status(toClientStatus(e.status)).body([error: e.message])
        } catch (Exception e) {
            log.error(failureMessage, e)
            return HttpResponse.serverError([error: failureMessage])
        }
    }
}
