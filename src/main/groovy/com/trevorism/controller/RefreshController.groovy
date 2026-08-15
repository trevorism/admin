package com.trevorism.controller

import com.trevorism.service.UserSessionService
import io.micronaut.core.annotation.Nullable
import io.micronaut.http.HttpResponse
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.CookieValue
import io.micronaut.http.annotation.Post
import io.micronaut.http.cookie.Cookie
import io.micronaut.http.netty.cookies.NettyCookie
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.inject.Inject

@Controller("/api/refresh")
class RefreshController {

    private static final int ACCESS_MAX_AGE = 15 * 60
    private static final int REFRESH_MAX_AGE = 24 * 60 * 60
    private static final String DOMAIN = ".trevorism.com"

    @Inject
    UserSessionService userSessionService

    @Tag(name = "Refresh Operations")
    @Operation(summary = "Exchange the refresh token cookie for a fresh session token")
    @Post(value = "/", produces = MediaType.APPLICATION_JSON)
    HttpResponse refresh(@CookieValue("refresh_token") @Nullable String refreshToken,
                         @CookieValue("user_name") @Nullable String userName) {
        if (!refreshToken) {
            return HttpResponse.unauthorized().cookies(clearedCookies())
        }

        String token = userSessionService.redeemRefreshToken(refreshToken)
        if (!token) {
            return HttpResponse.unauthorized().cookies(clearedCookies())
        }

        Set<Cookie> cookies = [
                new NettyCookie("session", token).path("/").maxAge(ACCESS_MAX_AGE).secure(true).domain(DOMAIN).httpOnly(true)
        ] as Set<Cookie>
        if (userName) {
            cookies << new NettyCookie("user_name", userName).path("/").maxAge(REFRESH_MAX_AGE).secure(true).domain(DOMAIN)
        }

        return HttpResponse.ok([status: "refreshed"]).cookies(cookies)
    }

    private static Set<Cookie> clearedCookies() {
        Cookie session = new NettyCookie("session", "").path("/").maxAge(0).secure(true).domain(DOMAIN).httpOnly(true)
        Cookie userName = new NettyCookie("user_name", "").path("/").maxAge(0).secure(true).domain(DOMAIN)
        Cookie refresh = new NettyCookie("refresh_token", "").path("/").maxAge(0).secure(true).domain(DOMAIN).httpOnly(true)
        return [session, userName, refresh] as Set<Cookie>
    }
}
