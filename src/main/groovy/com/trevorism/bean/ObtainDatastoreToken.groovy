package com.trevorism.bean

import com.trevorism.ClasspathBasedPropertiesProvider
import com.trevorism.PropertiesProvider
import com.trevorism.http.HttpClient
import com.trevorism.https.token.InvalidTokenCredentialsException
import com.trevorism.https.token.ObtainTokenStrategy
import groovy.json.JsonOutput

class ObtainDatastoreToken implements ObtainTokenStrategy {

    private static final String TOKEN_ENDPOINT = "https://auth.trevorism.com/token"
    private static final String DATASTORE_AUDIENCE = "6ba426e4-f740-44b5-98ce-15a5bc4ed105"

    private HttpClient httpClient
    private PropertiesProvider propertiesProvider = new ClasspathBasedPropertiesProvider()

    void setHttpClient(HttpClient client) {
        this.httpClient = client
    }

    String getToken() {
        String clientId = propertiesProvider.getProperty("clientId")
        String clientSecret = propertiesProvider.getProperty("clientSecret")
        if (!clientId || !clientSecret) {
            throw new InvalidTokenCredentialsException()
        }

        String json = JsonOutput.toJson(new AudienceTokenRequest(id: clientId, password: clientSecret,
                audience: DATASTORE_AUDIENCE))
        try {
            return httpClient.post(TOKEN_ENDPOINT, json)
        } catch (Exception e) {
            throw new InvalidTokenCredentialsException(e)
        }
    }
}
