# Authentication system update

## Email module

To send email verification and password reset emails.

- Support various transport (email backend: custom smtp, mailjet, ...)
- If not transport specified, will print the emails in console (debug mode)
- Support maildev (service inclued in docker-compose). Dev server to simulate production smtp server + mailbox


## Authentication update

- JWT refresh token
- email verification token (route to send & verifiy token, added table in db to store the tokens)
- password reset (route to generate a token + send by email & route to reset password, added table in db to store the tokens)
- change password route
- prepare support various providers (untested): 
    - login & signup with various providers for same user


## Separation User / Auth

User module only concern user data. No authentication data is handled in this module (email, password, isSuperAdmin).

Updates of user data (firstName, lastName, workspaces, ...) are done in the user module.
Updates regarding passwords and other auth methods are done in the auth module.