package com.trevorism.service

import com.trevorism.http.util.InvalidRequestException
import io.micronaut.http.HttpStatus
import org.junit.jupiter.api.Test

import static org.junit.jupiter.api.Assertions.assertThrows

class DownstreamTest {

    @Test
    void testCallReturnsTheResultWhenTheWorkSucceeds() {
        assert Downstream.call("nope") { "value" } == "value"
    }

    @Test
    void testCallPreservesTheDownstreamStatusCode() {
        def thrown = assertThrows(DownstreamException) {
            Downstream.call("Unable to approve") {
                throw new InvalidRequestException(new RuntimeException("boom"), 400)
            }
        }

        assert thrown.status == 400
        assert thrown.message == "Unable to approve"
    }

    @Test
    void testCallRethrowsAnExistingDownstreamExceptionUnchanged() {
        def thrown = assertThrows(DownstreamException) {
            Downstream.call("generic") { throw new DownstreamException(404, "No user named ghost") }
        }

        assert thrown.status == 404
        assert thrown.message == "No user named ghost"
    }

    @Test
    void testCallTreatsAnUnexpectedFailureAsABadGateway() {
        def thrown = assertThrows(DownstreamException) {
            Downstream.call("Unable to list users") { throw new IllegalStateException("socket closed") }
        }

        assert thrown.status == 502
        assert thrown.message == "Unable to list users"
    }

    @Test
    void testAnUnauthorizedDownstreamBecomesForbiddenSoTheClientDoesNotLoopThroughRefresh() {
        assert Downstream.toClientStatus(401) == HttpStatus.FORBIDDEN
        assert Downstream.toClientStatus(403) == HttpStatus.FORBIDDEN
    }

    @Test
    void testStatusMapping() {
        assert Downstream.toClientStatus(400) == HttpStatus.BAD_REQUEST
        assert Downstream.toClientStatus(404) == HttpStatus.NOT_FOUND
        assert Downstream.toClientStatus(500) == HttpStatus.BAD_GATEWAY
        assert Downstream.toClientStatus(502) == HttpStatus.BAD_GATEWAY
    }
}
