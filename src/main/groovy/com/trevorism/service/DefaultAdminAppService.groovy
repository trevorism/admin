package com.trevorism.service

import com.trevorism.data.FastDatastoreRepository
import com.trevorism.data.Repository
import com.trevorism.https.SecureHttpClient
import com.trevorism.model.App
import com.trevorism.model.RegisterAppRequest
import com.trevorism.model.RegisteredApp
import groovy.json.JsonOutput
import jakarta.inject.Named
import jakarta.inject.Singleton

@Singleton
class DefaultAdminAppService implements AdminAppService {

    private final SecureHttpClient callerClient
    private final Repository<App> allTenantsRepository

    DefaultAdminAppService(@Named("passThruSecureHttpClient") SecureHttpClient callerClient,
                           @Named("datastoreSecureHttpClient") SecureHttpClient datastoreClient) {
        this.callerClient = callerClient
        this.allTenantsRepository = new FastDatastoreRepository<>(App, datastoreClient)
    }

    @Override
    List<App> listApps(CallerContext caller) {
        requireAdministrator(caller)
        if (caller.globalAdmin) {
            return Downstream.call("Unable to list apps") { allTenantsRepository.all() }
        }
        return Downstream.call("Unable to list apps") {
            Mappers.toApps(Mappers.parse(callerClient.get("${Endpoints.AUTH_PROVIDER}/app/")))
        }
    }

    @Override
    RegisteredApp register(RegisterAppRequest request, CallerContext caller) {
        requireAdministrator(caller)
        if (!request?.appName?.trim()) {
            throw new DownstreamException(400, "An application name is required")
        }

        String body = JsonOutput.toJson([appName    : request.appName.trim(),
                                         replyUrls  : request.replyUrls ?: [],
                                         logoutUrls : request.logoutUrls ?: [],
                                         permissions: request.permissions ?: null,
                                         tenantGuid : caller.tenant])

        App created = Downstream.call("Unable to register ${request.appName}") {
            Mappers.toApp(Mappers.parse(callerClient.post("${Endpoints.AUTH_PROVIDER}/app/", body)) as Map)
        }
        if (!created?.clientId) {
            throw new DownstreamException(502, "The application was created without a client id")
        }

        String secret = mintSecret(created.clientId, request.appName)
        return new RegisteredApp(app: created, clientSecret: secret)
    }

    @Override
    String rotateSecret(String clientId, CallerContext caller) {
        requireAdministrator(caller)
        App target = listApps(caller).find { it.clientId == clientId }
        if (!target) {
            throw new DownstreamException(404, "No application with client id ${clientId}")
        }
        return mintSecret(target.clientId, target.appName)
    }

    @Override
    void delete(String id, CallerContext caller) {
        requireAdministrator(caller)
        App target = listApps(caller).find { it.id == id }
        if (!target) {
            throw new DownstreamException(404, "No application with id ${id}")
        }
        Downstream.call("Unable to delete ${target.appName}") {
            callerClient.delete("${Endpoints.AUTH_PROVIDER}/app/${URLEncoder.encode(id, "UTF-8")}")
        }
    }

    private String mintSecret(String clientId, String appName) {
        String raw = Downstream.call("Unable to generate a secret for ${appName}") {
            callerClient.put("${Endpoints.AUTH_PROVIDER}/app/${URLEncoder.encode(clientId, "UTF-8")}/secret", "{}")
        }
        return unquote(raw)
    }

    private static String unquote(String raw) {
        String value = raw?.trim()
        if (value?.length() > 1 && value.startsWith('"') && value.endsWith('"')) {
            return value.substring(1, value.length() - 1)
        }
        return value
    }

    private static void requireAdministrator(CallerContext caller) {
        if (!caller?.canAdminister()) {
            throw new DownstreamException(403, "Administrator access is required")
        }
    }
}
