package com.trevorism.service

import com.trevorism.https.SecureHttpClient
import com.trevorism.model.Tenant
import groovy.json.JsonOutput
import jakarta.inject.Named
import jakarta.inject.Singleton

@Singleton
class DefaultAdminTenantService implements AdminTenantService {

    private final SecureHttpClient callerClient

    DefaultAdminTenantService(@Named("passThruSecureHttpClient") SecureHttpClient callerClient) {
        this.callerClient = callerClient
    }

    @Override
    List<Tenant> listTenants(CallerContext caller) {
        if (!caller?.canManageTenants()) {
            throw new DownstreamException(403, "Global administrator access is required")
        }
        return Downstream.call("Unable to list tenants") {
            Mappers.toTenants(Mappers.parse(callerClient.get("${Endpoints.TENANT}/tenant/")))
        }
    }

    @Override
    Tenant currentTenant(CallerContext caller) {
        if (!caller?.canAdminister()) {
            throw new DownstreamException(403, "Administrator access is required")
        }
        if (!caller.tenant) {
            return null
        }
        return Downstream.call("Unable to load your tenant") {
            Mappers.toTenant(Mappers.parse(callerClient.get("${Endpoints.TENANT}/tenant/me")) as Map)
        }
    }

    @Override
    Tenant create(String name, String domain, CallerContext caller) {
        if (!caller?.canManageTenants()) {
            throw new DownstreamException(403, "Global administrator access is required")
        }
        if (!name?.trim()) {
            throw new DownstreamException(400, "A tenant name is required")
        }

        String body = JsonOutput.toJson([name: name.trim(), domain: domain?.trim()])
        return Downstream.call("Unable to create ${name}") {
            Mappers.toTenant(Mappers.parse(callerClient.post("${Endpoints.TENANT}/tenant/", body)) as Map)
        }
    }
}
