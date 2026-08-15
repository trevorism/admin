package com.trevorism.service

import com.trevorism.http.util.InvalidRequestException
import io.micronaut.http.HttpStatus

class Downstream {

    static <T> T call(String failureMessage, Closure<T> work) {
        try {
            return work.call()
        } catch (InvalidRequestException e) {
            throw new DownstreamException(e.statusCode, failureMessage)
        } catch (DownstreamException e) {
            throw e
        } catch (Exception e) {
            throw new DownstreamException(502, failureMessage)
        }
    }

    static HttpStatus toClientStatus(int status) {
        if (status == 400) {
            return HttpStatus.BAD_REQUEST
        }
        if (status == 401 || status == 403) {
            return HttpStatus.FORBIDDEN
        }
        if (status == 404) {
            return HttpStatus.NOT_FOUND
        }
        return HttpStatus.BAD_GATEWAY
    }
}
