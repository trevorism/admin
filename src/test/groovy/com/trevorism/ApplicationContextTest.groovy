package com.trevorism

import com.trevorism.bean.DatastoreSecureHttpClient
import com.trevorism.controller.AppController
import com.trevorism.controller.TenantController
import com.trevorism.controller.UserController
import com.trevorism.controller.WhoamiController
import com.trevorism.https.SecureHttpClient
import com.trevorism.service.AdminAppService
import com.trevorism.service.AdminTenantService
import com.trevorism.service.AdminUserService
import com.trevorism.service.UserSessionService
import io.micronaut.context.ApplicationContext
import io.micronaut.inject.qualifiers.Qualifiers
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test

class ApplicationContextTest {

    private static ApplicationContext context

    @BeforeAll
    static void startContext() {
        context = ApplicationContext.run("test")
    }

    @AfterAll
    static void stopContext() {
        context?.close()
    }

    @Test
    void testEveryAdministrationServiceResolvesToExactlyOneImplementation() {
        assert context.getBeanDefinition(AdminUserService)
        assert context.getBeanDefinition(AdminAppService)
        assert context.getBeanDefinition(AdminTenantService)
        assert context.getBeanDefinition(UserSessionService)
    }

    @Test
    void testEveryControllerIsRegistered() {
        assert context.getBeanDefinition(WhoamiController)
        assert context.getBeanDefinition(UserController)
        assert context.getBeanDefinition(AppController)
        assert context.getBeanDefinition(TenantController)
    }

    @Test
    void testBothSecureHttpClientsAreRegisteredUnderDistinctNames() {
        assert context.getBeanDefinition(SecureHttpClient, Qualifiers.byName("passThruSecureHttpClient"))
        assert context.getBeanDefinition(SecureHttpClient, Qualifiers.byName("datastoreSecureHttpClient"))
    }

    @Test
    void testTheDatastoreClientInstantiatesBecauseItCarriesItsOwnAppIdentity() {
        assert context.getBean(DatastoreSecureHttpClient)
    }
}
