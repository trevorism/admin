package com.trevorism.controller

import com.trevorism.model.ApproveRequest
import com.trevorism.model.PermissionsRequest
import com.trevorism.model.User
import com.trevorism.model.UsernameRequest
import com.trevorism.secure.Roles
import com.trevorism.secure.Secure
import com.trevorism.service.AdminUserService
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
import io.micronaut.security.authentication.Authentication
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.inject.Inject
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import static com.trevorism.service.Downstream.toClientStatus

@Controller("/api/user")
class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController)

    @Inject
    AdminUserService adminUserService

    @Tag(name = "User Operations")
    @Operation(summary = "Lists the users the caller may administer **Secure")
    @Get(value = "/", produces = MediaType.APPLICATION_JSON)
    @Secure(Roles.TENANT_ADMIN)
    HttpResponse<?> listUsers(Authentication authentication) {
        return respond("Unable to list users") {
            List<User> users = adminUserService.listUsers(CallerContext.from(authentication))
            HttpResponse.ok(users)
        }
    }

    @Tag(name = "User Operations")
    @Operation(summary = "Approves a pending user, optionally granting administrator access **Secure")
    @Post(value = "/approve", produces = MediaType.APPLICATION_JSON, consumes = MediaType.APPLICATION_JSON)
    @Secure(Roles.TENANT_ADMIN)
    HttpResponse<?> approve(@Body ApproveRequest request, Authentication authentication) {
        return respond("Unable to approve the user") {
            adminUserService.approve(request?.username, request?.admin, CallerContext.from(authentication))
            HttpResponse.ok([status: "approved"])
        }
    }

    @Tag(name = "User Operations")
    @Operation(summary = "Deactivates a user **Secure")
    @Post(value = "/deactivate", produces = MediaType.APPLICATION_JSON, consumes = MediaType.APPLICATION_JSON)
    @Secure(Roles.TENANT_ADMIN)
    HttpResponse<?> deactivate(@Body UsernameRequest request, Authentication authentication) {
        return respond("Unable to deactivate the user") {
            adminUserService.deactivate(request?.username, CallerContext.from(authentication))
            HttpResponse.ok([status: "deactivated"])
        }
    }

    @Tag(name = "User Operations")
    @Operation(summary = "Updates the permissions of a user **Secure")
    @Post(value = "/permissions", produces = MediaType.APPLICATION_JSON, consumes = MediaType.APPLICATION_JSON)
    @Secure(Roles.TENANT_ADMIN)
    HttpResponse<?> updatePermissions(@Body PermissionsRequest request, Authentication authentication) {
        return respond("Unable to update the permissions") {
            adminUserService.updatePermissions(request?.username, request?.permissions, CallerContext.from(authentication))
            HttpResponse.ok([status: "updated"])
        }
    }

    @Tag(name = "User Operations")
    @Operation(summary = "Deletes a user in the caller's own tenant **Secure")
    @Delete(value = "/{username}", produces = MediaType.APPLICATION_JSON)
    @Secure(Roles.TENANT_ADMIN)
    HttpResponse<?> delete(@PathVariable String username, Authentication authentication) {
        return respond("Unable to delete the user") {
            adminUserService.delete(username, CallerContext.from(authentication))
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
