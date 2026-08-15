package com.trevorism.service

import com.trevorism.http.HttpClient
import com.trevorism.http.JsonHttpClient
import groovy.json.JsonOutput
import jakarta.inject.Singleton
import org.slf4j.Logger
import org.slf4j.LoggerFactory

@Singleton
class DefaultUserSessionService implements UserSessionService {

    private static final Logger log = LoggerFactory.getLogger(DefaultUserSessionService)

    private static final String REDEEM_URL = "https://auth.trevorism.com/token/refresh/redeem"

    private HttpClient httpClient = new JsonHttpClient()

    @Override
    String redeemRefreshToken(String refreshToken) {
        if (!refreshToken) {
            return null
        }
        try {
            String result = httpClient.post(REDEEM_URL, JsonOutput.toJson([refreshToken: refreshToken]))
            if (!result || result.startsWith("<html>")) {
                return null
            }
            return result
        } catch (Exception e) {
            log.debug("Unable to redeem refresh token", e)
            return null
        }
    }
}
