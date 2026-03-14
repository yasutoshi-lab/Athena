# Login Screen

## Overview

This is the authentication screen for accessing Athena. Users sign in by entering their username and password.

## Layout

```
┌─────────────────────────────────────────────┐
│                                             │
│           ┌─────────────────────┐           │
│           │  [A] Athena          │           │
│           │                     │           │
│           │  Login               │           │
│           │  Sign in to the     │           │
│           │  causal inference...│           │
│           │                     │           │
│           │  Username            │           │
│           │  ┌─────────────────┐│           │
│           │  │ admin           ││           │
│           │  └─────────────────┘│           │
│           │                     │           │
│           │  Password            │           │
│           │  ┌─────────────────┐│           │
│           │  │ ••••••••        ││           │
│           │  └─────────────────┘│           │
│           │                     │           │
│           │  [    Login    ]    │           │
│           │                     │           │
│           │  Athena v0.1        │           │
│           └─────────────────────┘           │
│                                             │
└─────────────────────────────────────────────┘
```

## How to Use

1. Enter your **Username**
2. Enter your **Password**
3. Click the **"Login" button** or press **Enter** to submit
4. After successful authentication, you will be redirected to the main screen automatically

## Notes

- If login fails, an error message "Login failed" is displayed
- Authentication uses JWT (JSON Web Token)
- Access tokens are valid for 1 hour; refresh tokens are valid for 7 days
- If a valid token remains, subsequent visits will skip the login screen and go directly to the main screen
- Multi-language support is available (switch between Japanese and English in the settings screen)
