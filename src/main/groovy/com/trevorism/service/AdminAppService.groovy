package com.trevorism.service

import com.trevorism.model.App
import com.trevorism.model.RegisterAppRequest
import com.trevorism.model.RegisteredApp

interface AdminAppService {

    List<App> listApps(CallerContext caller)
    RegisteredApp register(RegisterAppRequest request, CallerContext caller)
    String rotateSecret(String clientId, CallerContext caller)
    void delete(String id, CallerContext caller)
}
