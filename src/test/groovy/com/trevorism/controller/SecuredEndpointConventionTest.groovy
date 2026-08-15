package com.trevorism.controller

import com.trevorism.secure.Roles
import com.trevorism.secure.Secure
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Put
import org.junit.jupiter.api.Test

import java.lang.reflect.Method

class SecuredEndpointConventionTest {

    private static List<Method> routes(Class<?> controller) {
        return controller.declaredMethods.findAll { Method method ->
            method.isAnnotationPresent(Get) || method.isAnnotationPresent(Post) ||
                    method.isAnnotationPresent(Put) || method.isAnnotationPresent(Delete)
        }
    }

    private static void assertEveryRouteRequires(Class<?> controller, String role) {
        List<Method> found = routes(controller)
        assert !found.isEmpty()
        found.each { Method method ->
            Secure secure = method.getAnnotation(Secure)
            assert secure != null: "${controller.simpleName}.${method.name} is missing @Secure and would be public"
            assert secure.value() == role: "${controller.simpleName}.${method.name} requires ${secure.value()} but should require ${role}"
        }
    }

    @Test
    void testEveryUserRouteRequiresATenantAdministrator() {
        assertEveryRouteRequires(UserController, Roles.TENANT_ADMIN)
    }

    @Test
    void testEveryAppRouteRequiresATenantAdministrator() {
        assertEveryRouteRequires(AppController, Roles.TENANT_ADMIN)
    }

    @Test
    void testWhoamiIsReachableByAnySignedInUserSoAccessDeniedCanRender() {
        assertEveryRouteRequires(WhoamiController, Roles.USER)
    }

    @Test
    void testTenantRoutesAreGlobalAdminOnlyApartFromTheCallersOwnTenant() {
        routes(TenantController).each { Method method ->
            Secure secure = method.getAnnotation(Secure)
            assert secure != null: "TenantController.${method.name} is missing @Secure"
            String expected = method.name == "currentTenant" ? Roles.TENANT_ADMIN : Roles.ADMIN
            assert secure.value() == expected: "TenantController.${method.name} requires ${secure.value()} but should require ${expected}"
        }
    }

    @Test
    void testTenantDeletionIsNotExposed() {
        assert routes(TenantController).every { it.name != "delete" }
        assert !TenantController.declaredMethods.any { it.isAnnotationPresent(Delete) }
    }

    @Test
    void testRefreshStaysUnsecuredBecauseItAuthenticatesWithTheRefreshCookie() {
        routes(RefreshController).each { Method method ->
            assert method.getAnnotation(Secure) == null
        }
    }
}
