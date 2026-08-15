package com.trevorism.controller

import com.trevorism.model.App
import com.trevorism.model.RegisterAppRequest
import com.trevorism.model.RegisteredApp
import com.trevorism.secure.Roles
import com.trevorism.secure.Secure
import com.trevorism.service.AdminAppService
import com.trevorism.service.CallerContext
import com.trevorism.service.DownstreamException
import io.micronaut.http.HttpResponse
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.PathVariable
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Put
import io.micronaut.security.authentication.Authentication
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.inject.Inject
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import static com.trevorism.service.Downstream.toClientStatus

@Controller("/api/app")
class AppController {

    private static final Logger log = LoggerFactory.getLogger(AppController)

    @Inject
    AdminAppService adminAppService

    @Tag(name = "App Operations")
    @Operation(summary = "Lists the applications the caller may administer **Secure")
    @Get(value = "/", produces = MediaType.APPLICATION_JSON)
    @Secure(Roles.TENANT_ADMIN)
    HttpResponse<?> listApps(Authentication authentication) {
        return respond("Unable to list applications") {
            List<App> apps = adminAppService.listApps(CallerContext.from(authentication))
            HttpResponse.ok(apps)
        }
    }

    @Tag(name = "App Operations")
    @Operation(summary = "Registers an application and returns its only copy of the client secret **Secure")
    @Post(value = "/", produces = MediaType.APPLICATION_JSON, consumes = MediaType.APPLICATION_JSON)
    @Secure(Roles.TENANT_ADMIN)
    HttpResponse<?> register(@Body RegisterAppRequest request, Authentication authentication) {
        return respond("Unable to register the application") {
            RegisteredApp registered = adminAppService.register(request, CallerContext.from(authentication))
            HttpResponse.ok(registered)
        }
    }

    @Tag(name = "App Operations")
    @Operation(summary = "Rotates an application secret and returns its only copy **Secure")
    @Put(value = "/{clientId}/secret", produces = MediaType.APPLICATION_JSON)
    @Secure(Roles.TENANT_ADMIN)
    HttpResponse<?> rotateSecret(@PathVariable String clientId, Authentication authentication) {
        return respond("Unable to rotate the application secret") {
            String secret = adminAppService.rotateSecret(clientId, CallerContext.from(authentication))
            HttpResponse.ok([clientId: clientId, clientSecret: secret])
        }
    }

    @Tag(name = "App Operations")
    @Operation(summary = "Deletes an application **Secure")
    @Delete(value = "/{id}", produces = MediaType.APPLICATION_JSON)
    @Secure(Roles.TENANT_ADMIN)
    HttpResponse<?> delete(@PathVariable String id, Authentication authentication) {
        return respond("Unable to delete the application") {
            adminAppService.delete(id, CallerContext.from(authentication))
            HttpResponse.ok([status: "deleted"])
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
