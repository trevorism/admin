package com.trevorism.bean

import com.trevorism.https.SecureHttpClient
import com.trevorism.https.SecureHttpClientBase
import jakarta.inject.Named
import jakarta.inject.Singleton

@Singleton
@Named("datastoreSecureHttpClient")
class DatastoreSecureHttpClient extends SecureHttpClientBase implements SecureHttpClient {

    DatastoreSecureHttpClient() {
        super(new ObtainDatastoreToken())
    }
}
