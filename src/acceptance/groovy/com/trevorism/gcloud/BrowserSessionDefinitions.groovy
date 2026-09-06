package com.trevorism.gcloud

this.metaClass.mixin(io.cucumber.groovy.Hooks)
this.metaClass.mixin(io.cucumber.groovy.EN)

String baseUrl = System.getenv("ACCEPTANCE_BASE_URL") ?: "https://admin.auth.trevorism.com"

int connectTimeoutMillis = 10_000
int readTimeoutMillis = 30_000

def status
def location
def body

def open = { String path, String method ->
    HttpURLConnection connection = new URL("${baseUrl}/${path}").openConnection() as HttpURLConnection
    connection.instanceFollowRedirects = false
    connection.requestMethod = method
    connection.connectTimeout = connectTimeoutMillis
    connection.readTimeout = readTimeoutMillis
    return connection
}

When(~/^I ask the console who is signed in$/) { ->
    HttpURLConnection connection = open("api/auth/session", "GET")
    status = connection.responseCode
    body = status < 400 ? connection.inputStream.text : null
    connection.disconnect()
}

Then(~/^the console reports that nobody is signed in$/) { ->
    assert status == 200, "expected 200 but got ${status}"
    assert body?.contains('"authenticated":false'), "unexpected session body: ${body}"
}

When(~/^I start the login handoff$/) { ->
    HttpURLConnection connection = open("api/auth/login", "GET")
    status = connection.responseCode
    location = connection.getHeaderField("Location")
    connection.disconnect()
}

Then(~/^the console sends me to the login application with a callback on its own host$/) { ->
    assert status == 302, "expected a 302 but got ${status}"
    assert location?.startsWith("https://login.auth.trevorism.com/authorize"), location
    assert location.contains(URLEncoder.encode("${baseUrl}/api/auth/callback", "UTF-8")), location
    assert location.contains("state="), location
}

/**
 * Posts with no body under a caller-chosen content type. A browser labels a bodyless post
 * form-urlencoded, and an endpoint that only consumes JSON answers 415 before the handler
 * runs, which a check that always sends JSON cannot see.
 */
When(~/^I POST "(.*)" as "(.*)"$/) { String path, String contentType ->
    HttpURLConnection connection = open(path, "POST")
    connection.setRequestProperty("Content-Type", contentType)
    connection.setRequestProperty("Content-Length", "0")
    connection.doOutput = true
    connection.outputStream.withCloseable { it.write(new byte[0]) }
    status = connection.responseCode
    connection.disconnect()
}

When(~/^I GET "(.*)" anonymously$/) { String path ->
    HttpURLConnection connection = open(path, "GET")
    status = connection.responseCode
    connection.disconnect()
}

Then(~/^the console answers (\d+)$/) { Integer expected ->
    assert status == expected, "expected ${expected} but got ${status}"
}
