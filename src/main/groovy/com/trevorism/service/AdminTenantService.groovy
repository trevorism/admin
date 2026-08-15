package com.trevorism.service

import com.trevorism.model.Tenant

interface AdminTenantService {

    List<Tenant> listTenants(CallerContext caller)
    Tenant currentTenant(CallerContext caller)
    Tenant create(String name, String domain, CallerContext caller)
}
