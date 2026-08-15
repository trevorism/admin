package com.trevorism.model

class App {

    String id
    String appName
    String clientId

    List<String> replyUrls
    List<String> logoutUrls

    String tenantGuid
    String tenantId
    String permissions

    boolean active

    Date dateCreated
    Date dateExpired
}
