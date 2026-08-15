package com.trevorism.controller

import com.trevorism.model.ApproveRequest
import com.trevorism.model.RegisterAppRequest
import com.trevorism.model.Tenant
import com.trevorism.model.UsernameRequest
import com.trevorism.secure.Roles
import com.trevorism.service.AdminAppService
import com.trevorism.service.AdminTenantService
import com.trevorism.service.AdminUserService
import com.trevorism.service.CallerContext
import com.trevorism.service.DownstreamException
import io.micronaut.http.HttpResponse
import io.micronaut.http.HttpStatus
import io.micronaut.security.authentication.Authentication
import org.junit.jupiter.api.Test

class AdminControllerErrorHandlingTest {

    private static Authentication auth(String role = Roles.ADMIN) {
        [getName: { "tbrooks" }, getRoles: { [role] }, getAttributes: { [:] }] as Authentication
    }

    private static UserController userController(Closure listUsers) {
        UserController controller = new UserController()
        controller.adminUserService = [listUsers: listUsers] as AdminUserService
        return controller
    }

    @Test
    void testADownstreamBadRequestBecomesABadRequestCarryingTheMessage() {
        def controller = userController { CallerContext caller -> throw new DownstreamException(400, "Bad tenant") }

        HttpResponse<?> response = controller.listUsers(auth())

        assert response.status == HttpStatus.BAD_REQUEST
        assert response.body()["error"] == "Bad tenant"
    }

    @Test
    void testADownstreamForbiddenIsNotReemittedAsUnauthorized() {
        def controller = userController { CallerContext caller -> throw new DownstreamException(401, "Nope") }

        HttpResponse<?> response = controller.listUsers(auth())

        assert response.status == HttpStatus.FORBIDDEN
        assert response.status != HttpStatus.UNAUTHORIZED
    }

    @Test
    void testAMissingRecordBecomesNotFound() {
        def controller = userController { CallerContext caller -> throw new DownstreamException(404, "No user named ghost") }

        assert controller.listUsers(auth()).status == HttpStatus.NOT_FOUND
    }

    @Test
    void testAnUnexpectedFailureBecomesAServerErrorWithAGenericMessage() {
        def controller = userController { CallerContext caller -> throw new IllegalStateException("kaboom") }

        HttpResponse<?> response = controller.listUsers(auth())

        assert response.status == HttpStatus.INTERNAL_SERVER_ERROR
        assert response.body()["error"] == "Unable to list users"
        assert !response.body()["error"].toString().contains("kaboom")
    }

    @Test
    void testASuccessfulListIsReturnedAsIs() {
        def controller = userController { CallerContext caller -> [] }

        assert controller.listUsers(auth()).status == HttpStatus.OK
    }

    @Test
    void testApproveReportsSuccess() {
        UserController controller = new UserController()
        String seen = null
        controller.adminUserService = [approve: { String username, Boolean admin, CallerContext caller ->
            seen = username
        }] as AdminUserService

        HttpResponse<?> response = controller.approve(new ApproveRequest(username: "alice", admin: false), auth())

        assert response.status == HttpStatus.OK
        assert seen == "alice"
    }

    @Test
    void testDeactivateReportsSuccess() {
        UserController controller = new UserController()
        controller.adminUserService = [deactivate: { String username, CallerContext caller -> }] as AdminUserService

        assert controller.deactivate(new UsernameRequest(username: "alice"), auth()).status == HttpStatus.OK
    }

    @Test
    void testDeleteSurfacesTheCrossTenantRefusalAsForbidden() {
        UserController controller = new UserController()
        controller.adminUserService = [delete: { String username, CallerContext caller ->
            throw new DownstreamException(403, "Users outside your own tenant cannot be deleted here")
        }] as AdminUserService

        HttpResponse<?> response = controller.delete("alice", auth())

        assert response.status == HttpStatus.FORBIDDEN
        assert response.body()["error"].toString().contains("outside your own tenant")
    }

    @Test
    void testAppRegistrationSurfacesTheSecretOnce() {
        AppController controller = new AppController()
        controller.adminAppService = [register: { RegisterAppRequest request, CallerContext caller ->
            new com.trevorism.model.RegisteredApp(app: new com.trevorism.model.App(appName: "widget"), clientSecret: "s3cret")
        }] as AdminAppService

        HttpResponse<?> response = controller.register(new RegisterAppRequest(appName: "widget"), auth())

        assert response.status == HttpStatus.OK
        assert response.body().clientSecret == "s3cret"
    }

    @Test
    void testRotateSecretReturnsTheClientIdAlongsideTheSecret() {
        AppController controller = new AppController()
        controller.adminAppService = [rotateSecret: { String clientId, CallerContext caller -> "rotated" }] as AdminAppService

        HttpResponse<?> response = controller.rotateSecret("c1", auth())

        assert response.body()["clientId"] == "c1"
        assert response.body()["clientSecret"] == "rotated"
    }

    @Test
    void testAppFailuresAreMapped() {
        AppController controller = new AppController()
        controller.adminAppService = [listApps: { CallerContext caller ->
            throw new DownstreamException(403, "Administrator access is required")
        }] as AdminAppService

        assert controller.listApps(auth(Roles.USER)).status == HttpStatus.FORBIDDEN
    }

    @Test
    void testTenantListFailuresAreMapped() {
        TenantController controller = new TenantController()
        controller.adminTenantService = [listTenants: { CallerContext caller ->
            throw new DownstreamException(403, "Global administrator access is required")
        }] as AdminTenantService

        assert controller.listTenants(auth(Roles.TENANT_ADMIN)).status == HttpStatus.FORBIDDEN
    }

    @Test
    void testCurrentTenantIsNotFoundWhenTheCallerHasNoTenant() {
        TenantController controller = new TenantController()
        controller.adminTenantService = [currentTenant: { CallerContext caller -> null }] as AdminTenantService

        assert controller.currentTenant(auth()).status == HttpStatus.NOT_FOUND
    }

    @Test
    void testCurrentTenantIsReturnedWhenPresent() {
        TenantController controller = new TenantController()
        controller.adminTenantService = [currentTenant: { CallerContext caller ->
            new Tenant(name: "Acme", guid: "g1")
        }] as AdminTenantService

        HttpResponse<?> response = controller.currentTenant(auth())

        assert response.status == HttpStatus.OK
        assert response.body().name == "Acme"
    }

    @Test
    void testTenantCreationReturnsTheCreatedTenant() {
        TenantController controller = new TenantController()
        controller.adminTenantService = [create: { String name, String domain, CallerContext caller ->
            new Tenant(name: name, guid: "g2")
        }] as AdminTenantService

        HttpResponse<?> response = controller.create(new Tenant(name: "Acme"), auth())

        assert response.status == HttpStatus.OK
        assert response.body().guid == "g2"
    }
}
