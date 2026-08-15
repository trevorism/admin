package com.trevorism.model

class User {

    String id
    String username
    String email
    String image

    boolean admin
    boolean active

    String tenantGuid
    String tenantId
    String permissions

    Date dateCreated
    Date dateExpired
}
