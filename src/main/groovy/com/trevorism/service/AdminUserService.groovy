package com.trevorism.service

import com.trevorism.model.RegisterUserRequest
import com.trevorism.model.RegisteredUser
import com.trevorism.model.User

interface AdminUserService {

    List<User> listUsers(CallerContext caller)
    RegisteredUser register(RegisterUserRequest request, CallerContext caller)
    void approve(String username, Boolean admin, CallerContext caller)
    void deactivate(String username, CallerContext caller)
    void updatePermissions(String username, String permissions, CallerContext caller)
    void delete(String username, CallerContext caller)
}
