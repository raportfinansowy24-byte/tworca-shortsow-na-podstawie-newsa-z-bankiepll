# Implementation Plan - Google Drive Persistent Session & Login Fix

## Problem Statement
Users are repeatedly prompted to log into Google Drive because the OAuth access token (`cachedAccessToken`) is kept strictly in volatile memory. On every page refresh or navigation, the token is lost, requiring a new popup sign-in. Additionally, `prompt: 'select_account'` forces account selection prompt every time.

## Proposed Changes

### 1. Update `src/services/googleDriveService.ts`
- **Session Caching**: Store and retrieve `cachedAccessToken` in `sessionStorage` (with fallback to memory) so that page reloads retain the active Google Drive session.
- **Automatic Token Restore / Init**: On app initialization (`initAuth`), check if a cached token exists in `sessionStorage` and restore it.
- **Adjust Auth Parameters**: Optionally relax `prompt: 'select_account'` if not explicitly requested, or keep it manageable so users aren't hassled unnecessarily.

## Verification Plan
- Build applet (`compile_applet`).
- Test that logging in once retains the Google Drive session across page refreshes without re-prompting.
