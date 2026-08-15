package com.trevorism.model

class Whoami {

    String username
    String role
    String tenant

    boolean globalAdmin
    boolean tenantAdmin
    boolean canAdminister
    boolean canManageTenants
}
