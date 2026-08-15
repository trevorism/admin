package com.trevorism.service

class DownstreamException extends RuntimeException {

    final int status

    DownstreamException(int status, String message) {
        super(message)
        this.status = status
    }
}
