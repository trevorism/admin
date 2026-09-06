package com.trevorism.service

import com.trevorism.model.App
import com.trevorism.model.Tenant
import com.trevorism.model.User
import org.junit.jupiter.api.Test

import java.time.Instant

class MappersTest {

    @Test
    void testParseReturnsNullForUnusableInput() {
        assert Mappers.parse(null) == null
        assert Mappers.parse("   ") == null
        assert Mappers.parse("<html>error</html>") == null
    }

    @Test
    void testToUsersIgnoresRecordsWithoutAUsername() {
        def parsed = Mappers.parse('[{"username":"alice"},{"email":"nobody@trevorism.com"},"junk"]')

        List<User> users = Mappers.toUsers(parsed)

        assert users.size() == 1
        assert users[0].username == "alice"
    }

    @Test
    void testToUsersReturnsEmptyWhenTheResponseIsNotAList() {
        assert Mappers.toUsers(Mappers.parse('{"username":"alice"}')) == []
        assert Mappers.toUsers(null) == []
    }

    @Test
    void testToUserCarriesTheTenantStampFromTheCrossTenantQuery() {
        User user = Mappers.toUser([username: "alice", tenantId: "namespace-a"])

        assert user.tenantId == "namespace-a"
    }

    @Test
    void testToUserCoercesBooleansFromStringsAndBooleans() {
        assert Mappers.toUser([username: "a", admin: true, active: "true"]).admin
        assert Mappers.toUser([username: "a", admin: true, active: "true"]).active
        assert !Mappers.toUser([username: "a", admin: "false", active: null]).admin
        assert !Mappers.toUser([username: "a"]).active
    }

    @Test
    void testToUserParsesEpochMillisAndIsoDates() {
        Date expected = Date.from(Instant.parse("2026-08-15T10:30:00Z"))

        assert Mappers.toUser([username: "a", dateCreated: 1700000000000L]).dateCreated == new Date(1700000000000L)
        assert Mappers.toUser([username: "a", dateCreated: "2026-08-15T10:30:00Z"]).dateCreated == expected
        assert Mappers.toUser([username: "a", dateCreated: "2026-08-15T10:30:00.000Z"]).dateCreated == expected
        assert Mappers.toUser([username: "a", dateCreated: "not a date"]).dateCreated == null
        assert Mappers.toUser([username: "a"]).dateCreated == null
    }

    @Test
    void testAZuluTimestampIsNotShiftedByTheHostTimezone() {
        Date expected = Date.from(Instant.parse("2026-08-15T10:30:00Z"))

        assert Mappers.toUser([username: "a", dateCreated: "2026-08-15T10:30:00Z"]).dateCreated == expected
        assert Mappers.toUser([username: "a", dateCreated: "2026-08-15T05:30:00-05:00"]).dateCreated == expected
        assert Mappers.toUser([username: "a", dateCreated: "2026-08-15T10:30:00.000+00:00"]).dateCreated == expected
    }

    @Test
    void testAUserViewCannotCarryAPasswordOrSaltEvenIfTheResponseDoes() {
        User user = Mappers.toUser([username: "alice", password: "hashed", salt: "s4lt"])

        assert !user.hasProperty("password")
        assert !user.hasProperty("salt")
    }

    @Test
    void testAnAppViewCannotCarryAClientSecret() {
        App app = Mappers.toApp([appName: "widget", clientId: "abc", clientSecret: "leaked", salt: "s4lt"])

        assert !app.hasProperty("clientSecret")
        assert !app.hasProperty("salt")
        assert app.appName == "widget"
    }

    @Test
    void testToAppNormalizesUrlListsAndSkipsEmptyRecords() {
        App app = Mappers.toApp([appName: "widget", clientId: "abc", replyUrls: ["https://a", "", null]])

        assert app.replyUrls == ["https://a"]
        assert app.logoutUrls == []
        assert Mappers.toApp([:]) == null
        assert Mappers.toApp(null) == null
    }

    @Test
    void testToAppsFiltersJunk() {
        List<App> apps = Mappers.toApps(Mappers.parse('[{"appName":"widget"},{"nothing":true}]'))

        assert apps.size() == 1
        assert apps[0].appName == "widget"
    }

    @Test
    void testToTenantRequiresANameOrGuid() {
        assert Mappers.toTenant([name: "Acme", billingMode: "SUBSCRIPTION"]).billingMode == "SUBSCRIPTION"
        assert Mappers.toTenant([name: "Acme"]).billingMode == "UNBILLED"
        assert Mappers.toTenant([name: "Acme"]) != null
        assert Mappers.toTenant([guid: "g1"]) != null
        assert Mappers.toTenant([id: "1"]) == null
        assert Mappers.toTenant(null) == null
    }

    @Test
    void testToTenantsMapsEveryUsableRecord() {
        List<Tenant> tenants = Mappers.toTenants(Mappers.parse('[{"name":"Acme","guid":"g1","domain":"acme.com"}]'))

        assert tenants.size() == 1
        assert tenants[0].domain == "acme.com"
    }

    @Test
    void testBlankStringsBecomeNull() {
        assert Mappers.toUser([username: "alice", email: "   "]).email == null
    }

    @Test
    void testAWhitespaceOnlyIdentifierIsTreatedAsMissing() {
        assert Mappers.toUser([username: "   "]) == null
        assert Mappers.toApp([appName: "   ", clientId: "  "]) == null
        assert Mappers.toTenant([name: " ", guid: "   "]) == null
        assert Mappers.toUsers(Mappers.parse('[{"username":"   "},{"username":"alice"}]')).size() == 1
    }
}
