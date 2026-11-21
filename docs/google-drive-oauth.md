# Google Drive and Sheets OAuth

The browser integration uses Google Identity Services (GIS) directly. Firebase App/Auth is not part of Drive, Sheets, or the private-panel login flow.

## Configuration

Set the public OAuth 2.0 Web Client ID as `VITE_GOOGLE_CLIENT_ID`.

- Local development: place it in `.env.local`.
- Fly build: `fly.toml` passes it as `[build.args].VITE_GOOGLE_CLIENT_ID`; Docker exposes it to Vite only during the image build.
- In Google Cloud Console, the OAuth client must be a **Web application** client. Add the production Fly origin and local development origin to **Authorized JavaScript origins**. Do not add URL paths.

The client ID is public and is expected to be present in the built frontend. It is not an API secret.

## Sign-in and token lifecycle

1. The user starts authorization with the Google button. GIS `requestAccessToken()` is called synchronously from that click handler.
2. The app requests Drive and Sheets read/write scopes plus OpenID profile scopes.
3. The profile is loaded from Google's userinfo endpoint.
4. The access token and its expiration are stored in `sessionStorage`, never `localStorage`.
5. Tokens expiring within 60 seconds are treated as expired. The old Firebase-era persistent token is deleted because it has no trustworthy expiry metadata. GIS does not supply a refresh token in this browser token model; obtaining a new token requires another user action.
6. Explicit logout clears the local session and asks GIS to revoke the current token.

Google Drive and Sheets calls continue to use the Google access token in their Authorization header. Same-origin job-export status requests use the private-panel session injected by AppAuthGate, not a Google ID token.

## Separate application login

The private panel still uses `APP_LOGIN_PASSWORD` and `APP_AUTH_SECRET`. That session protects the application's own API. Google OAuth only grants the browser access to the user's Drive and Sheets.

## Validation

- `npm run test:google-auth-state` checks expiry, storage cleanup, and Google profile mapping.
- `npm run test:google-auth-migration` checks that Firebase SDK/config references are absent.
