# Account Registration Screen

## Overview

This screen allows new users to create their own account. Users register by entering a username, email address, and password. After successful registration, the user is automatically logged in and redirected to the main screen.

## Layout

```
┌─────────────────────────────────────────────┐
│                                             │
│           ┌─────────────────────┐           │
│           │  [A] Athena  [JP|EN]│           │
│           │                     │           │
│           │  Create Account     │           │
│           │  Create a new       │           │
│           │  account            │           │
│           │                     │           │
│           │  Username            │           │
│           │  ┌─────────────────┐│           │
│           │  │                 ││           │
│           │  └─────────────────┘│           │
│           │                     │           │
│           │  Email               │           │
│           │  ┌─────────────────┐│           │
│           │  │                 ││           │
│           │  └─────────────────┘│           │
│           │                     │           │
│           │  Password            │           │
│           │  ┌─────────────────┐│           │
│           │  │ ••••••••        ││           │
│           │  └─────────────────┘│           │
│           │                     │           │
│           │  Confirm Password    │           │
│           │  ┌─────────────────┐│           │
│           │  │ ••••••••        ││           │
│           │  └─────────────────┘│           │
│           │                     │           │
│           │  [Create Account]   │           │
│           │                     │           │
│           │  Already have an    │           │
│           │  account? Login     │           │
│           └─────────────────────┘           │
│                                             │
└─────────────────────────────────────────────┘
```

## How to Use

1. Click the **"Sign Up" link** on the login screen to navigate here
2. Enter a **Username** (must be unique)
3. Enter an **Email** address (must be unique)
4. Enter a **Password**
5. Re-enter the same password in **Confirm Password**
6. Click the **"Create Account" button**
7. After successful registration, you will be automatically logged in and redirected to the main screen

## Input Fields

| Field | Required | Description |
|-------|----------|-------------|
| Username | Yes | Up to 150 characters. Used for login |
| Email | Yes | Must be a valid email format |
| Password | Yes | Must comply with Django's password policy (8+ characters, not purely numeric, not too common) |
| Confirm Password | Yes | Must match the Password field |

## Validation

Error messages are displayed in the following cases:

- Username is already taken
- Email address is already registered
- Password is too weak (too short, numeric only, too common, etc.)
- Password and Confirm Password do not match
- Required fields are left empty

## Language Switching

Use the **JP / EN** button in the top-right corner to switch the display language between Japanese and English. This toggle is available on both the login screen and the registration screen.

## Notes

- External authentication (Google, GitHub, etc.) is not supported. Only username and password authentication is used
- UserSettings are automatically created upon registration
- JWT tokens are issued immediately upon successful registration — no additional login step is required
- Click the "Login" link to return to the login screen

## API Endpoint

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register/` | POST | Register a new user. Returns JWT tokens on success |

### Request Example

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!"
}
```

### Response Example (201 Created)

```json
{
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "newuser@example.com",
    "settings": {
      "display_name": "",
      "nickname": "",
      "default_model": "auto",
      "complexity_threshold": 3,
      "system_prompt": "",
      "language": "ja",
      "color_mode": "dark",
      "graph_animation": true,
      "graph_grid": true,
      "animation_speed": "normal"
    }
  },
  "access": "eyJ...",
  "refresh": "eyJ..."
}
```
