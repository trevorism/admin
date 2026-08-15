package com.trevorism.model

import com.trevorism.data.deserialize.DatastoreDeserializer
import org.junit.jupiter.api.Test

class CrossTenantDeserializationTest {

    // Shaped like a real datastore /all/user record: the raw namespace query does not
    // run auth-provider's cleanUser, so it carries password and salt, and datastore
    // lowercases the stored field names.
    private static final String RAW_USER = '''[{
        "id": "1",
        "username": "alice",
        "email": "alice@trevorism.com",
        "password": "hashed-secret",
        "salt": "s4lt",
        "admin": true,
        "active": true,
        "permissions": "CRE",
        "tenantguid": "guid-abc",
        "tenantId": "namespace-abc",
        "datecreated": "2026-01-02T03:04:05Z",
        "dateexpired": "2027-01-02T03:04:05Z"
    }]'''

    private static final String RAW_APP = '''[{
        "id": "2",
        "appname": "widget",
        "clientid": "c1",
        "clientSecret": "leaked-secret",
        "salt": "s4lt",
        "active": true,
        "permissions": "R",
        "tenantguid": "guid-abc",
        "tenantId": "namespace-abc"
    }]'''

    @Test
    void testACrossTenantUserNeverCarriesAPasswordOrSalt() {
        User user = new DatastoreDeserializer<User>().deserializeJsonArray(RAW_USER, User)[0]

        assert !user.hasProperty("password")
        assert !user.hasProperty("salt")
        assert !user.properties.toString().contains("hashed-secret")
        assert !user.properties.toString().contains("s4lt")
    }

    @Test
    void testACrossTenantAppNeverCarriesAClientSecret() {
        App app = new DatastoreDeserializer<App>().deserializeJsonArray(RAW_APP, App)[0]

        assert !app.hasProperty("clientSecret")
        assert !app.hasProperty("salt")
        assert !app.properties.toString().contains("leaked-secret")
    }

    // Datastore lowercases stored field names; the deserializer matches them back
    // case insensitively, so these must not silently come through null.
    @Test
    void testLowercasedFieldNamesStillPopulateTheModel() {
        User user = new DatastoreDeserializer<User>().deserializeJsonArray(RAW_USER, User)[0]

        assert user.tenantGuid == "guid-abc"
        assert user.dateCreated != null
        assert user.dateExpired != null
    }

    @Test
    void testTheNamespaceStampIsCarriedSoTheUiCanAttributeTheRow() {
        User user = new DatastoreDeserializer<User>().deserializeJsonArray(RAW_USER, User)[0]
        App app = new DatastoreDeserializer<App>().deserializeJsonArray(RAW_APP, App)[0]

        assert user.tenantId == "namespace-abc"
        assert app.tenantId == "namespace-abc"
    }

    @Test
    void testOrdinaryFieldsSurvive() {
        User user = new DatastoreDeserializer<User>().deserializeJsonArray(RAW_USER, User)[0]

        assert user.username == "alice"
        assert user.email == "alice@trevorism.com"
        assert user.admin
        assert user.active
        assert user.permissions == "CRE"
    }
}
