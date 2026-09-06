Feature: Browser session
  The admin console serves its own session endpoints, and its data stays shut to anyone without one

  Scenario: An anonymous visitor has no session
    When I ask the console who is signed in
    Then the console reports that nobody is signed in

  Scenario: Signing in starts the one time code handoff
    When I start the login handoff
    Then the console sends me to the login application with a callback on its own host

  Scenario: Logout accepts the content type a browser actually sends
    When I POST "api/auth/logout" as "application/x-www-form-urlencoded"
    Then the console answers 200

  Scenario: Refreshing without a token is rejected
    When I POST "api/auth/refresh" as "application/x-www-form-urlencoded"
    Then the console answers 401

  Scenario: The refresh endpoint the console used to carry is gone
    When I POST "api/refresh/" as "application/json"
    Then the console answers 404

  Scenario: Asking who you are requires a session
    When I GET "api/whoami/" anonymously
    Then the console answers 401

  Scenario: The user list requires a session
    When I GET "api/user/" anonymously
    Then the console answers 401

  Scenario: The tenant list requires a session
    When I GET "api/tenant/" anonymously
    Then the console answers 401
