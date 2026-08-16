package com.trevorism.service

import com.trevorism.data.FastDatastoreRepository
import com.trevorism.data.Repository
import com.trevorism.https.SecureHttpClient
import com.trevorism.model.RegisterUserRequest
import com.trevorism.model.RegisteredUser
import com.trevorism.model.User
import groovy.json.JsonOutput
import jakarta.inject.Named
import jakarta.inject.Singleton

import java.security.SecureRandom

@Singleton
class DefaultAdminUserService implements AdminUserService {

    private static final int MINIMUM_USERNAME_LENGTH = 3
    private static final int GENERATED_PASSWORD_BYTES = 24
    private static final SecureRandom RANDOM = new SecureRandom()

    private final SecureHttpClient callerClient
    private final Repository<User> allTenantsRepository

    DefaultAdminUserService(@Named("passThruSecureHttpClient") SecureHttpClient callerClient,
                            @Named("datastoreSecureHttpClient") SecureHttpClient datastoreClient) {
        this.callerClient = callerClient
        this.allTenantsRepository = new FastDatastoreRepository<>(User, datastoreClient)
    }

    @Override
    List<User> listUsers(CallerContext caller) {
        requireAdministrator(caller)
        if (caller.globalAdmin) {
            return Downstream.call("Unable to list users") { allTenantsRepository.all() }
        }
        return Downstream.call("Unable to list users") {
            Mappers.toUsers(Mappers.parse(callerClient.get("${Endpoints.AUTH_PROVIDER}/user/")))
        }
    }

    @Override
    RegisteredUser register(RegisterUserRequest request, CallerContext caller) {
        requireAdministrator(caller)

        String username = request?.username?.trim()?.toLowerCase()
        String email = request?.email?.trim()?.toLowerCase()
        if (!username || username.length() < MINIMUM_USERNAME_LENGTH) {
            throw new DownstreamException(400, "A username of at least ${MINIMUM_USERNAME_LENGTH} characters is required")
        }
        if (!email || !email.contains("@")) {
            throw new DownstreamException(400, "A valid email address is required")
        }

        String password = generatePassword()
        String body = JsonOutput.toJson([username                          : username,
                                         password                          : password,
                                         email                             : email,
                                         tenantGuid                        : caller.tenant,
                                         permissions                       : request.permissions ?: null,
                                         autoRegister                      : false,
                                         doNotNotifySiteAdminOfRegistration: true])

        Downstream.call("Unable to register ${username}") {
            callerClient.post("${Endpoints.AUTH_PROVIDER}/user/", body)
        }
        return new RegisteredUser(username: username, password: password)
    }

    @Override
    void approve(String username, Boolean admin, CallerContext caller) {
        User target = requireUser(username, caller)

        boolean grantAdmin = (admin == null) ? target.admin : admin
        if (grantAdmin && !caller.globalAdmin) {
            throw new DownstreamException(403, "Only a global administrator can grant administrator access")
        }

        String body = JsonOutput.toJson([username           : target.username,
                                         tenantGuid         : tenantGuidFor(target, caller),
                                         isAdmin            : grantAdmin,
                                         doNotSendWelcomeEmail: false])
        Downstream.call("Unable to approve ${username}") {
            callerClient.post("${Endpoints.AUTH_PROVIDER}/user/activate", body)
        }
    }

    @Override
    void deactivate(String username, CallerContext caller) {
        User target = requireUser(username, caller)

        String body = JsonOutput.toJson([username             : target.username,
                                         tenantGuid           : tenantGuidFor(target, caller),
                                         isAdmin              : target.admin,
                                         doNotSendWelcomeEmail: true])
        Downstream.call("Unable to deactivate ${username}") {
            callerClient.post("${Endpoints.AUTH_PROVIDER}/user/deactivate", body)
        }
    }

    @Override
    void updatePermissions(String username, String permissions, CallerContext caller) {
        User target = requireUser(username, caller)

        String body = JsonOutput.toJson([username  : target.username,
                                         tenantGuid: tenantGuidFor(target, caller),
                                         permissions: permissions ?: ""])
        Downstream.call("Unable to update permissions for ${username}") {
            callerClient.post("${Endpoints.AUTH_PROVIDER}/user/permissions", body)
        }
    }

    @Override
    void delete(String username, CallerContext caller) {
        User target = requireUser(username, caller)
        if (!inCallerNamespace(target, caller)) {
            throw new DownstreamException(403, "Users outside your own tenant cannot be deleted here")
        }

        Downstream.call("Unable to delete ${username}") {
            callerClient.delete("${Endpoints.AUTH_PROVIDER}/user/${URLEncoder.encode(target.username, "UTF-8")}")
        }
    }

    private User requireUser(String username, CallerContext caller) {
        requireAdministrator(caller)
        if (!username?.trim()) {
            throw new DownstreamException(400, "A username is required")
        }
        User target = listUsers(caller).find { it.username?.equalsIgnoreCase(username) }
        if (!target) {
            throw new DownstreamException(404, "No user named ${username}")
        }
        return target
    }

    private static String generatePassword() {
        byte[] bytes = new byte[GENERATED_PASSWORD_BYTES]
        RANDOM.nextBytes(bytes)
        return Base64.urlEncoder.withoutPadding().encodeToString(bytes)
    }

    private static void requireAdministrator(CallerContext caller) {
        if (!caller?.canAdminister()) {
            throw new DownstreamException(403, "Administrator access is required")
        }
    }

    private static String tenantGuidFor(User target, CallerContext caller) {
        return caller.tenant ?: (target.tenantGuid ?: target.tenantId)
    }

    private static boolean inCallerNamespace(User target, CallerContext caller) {
        String targetTenant = target.tenantGuid ?: target.tenantId
        return (caller.tenant ?: null) == (targetTenant ?: null)
    }
}
