# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start                  # Start Expo with default env
npm run start:dev          # Copy .env.development → .env and start
npm run start:staging      # Copy .env.staging → .env and start
npm run start:prod         # Copy .env.production → .env and start

# Native builds (requires simulator/device)
npm run android
npm run ios

# Code quality
npm run lint               # expo lint (ESLint)
npm test                   # Run all Vitest tests
npx vitest run services/__tests__/ProductService.test.ts  # Run a single test file

# EAS Builds
eas build --profile preview --platform android     # Staging build
eas build --profile production --platform android  # Production build
```

## Architecture

### Navigation (Expo Router v6, file-based)

`app/_layout.tsx` wraps the entire app in three providers: `AuthProvider → AccountProvider → StatsProvider`. It renders a custom splash screen while fonts/auth are loading, then mounts `RootNavigator`.

`app/RootNavigator.tsx` switches between two stacks based on `isAuthenticated`:
- **AuthStack**: only `login` screen
- **AppStack**: `index` (home), `(tabs)/` (tab navigator; only the Scan tab exists, tab bar hidden)

### Authentication Flow

`AuthService` (singleton) handles Keycloak OAuth2 via PKCE using `expo-auth-session`. On login:
1. Opens Keycloak SSO in a web browser with PKCE
2. Exchanges the auth code for tokens
3. Stores `accessToken`, `refreshToken`, `id_token`, `tokenExpiry` in `expo-secure-store` (encrypted)
4. Fetches user accounts and roles from the API and stores them in `AsyncStorage`

`AuthContext` wraps `AuthService` for React components, exposes `isAuthenticated`, `login()`, `logout()`, `checkAuth()`. It also auto-logs out after 5 minutes of app backgrounding.

### API Layer

`services/ApiService.ts` exports an Axios instance configured with:
- `baseURL` from `apiConfig.apiUrl`
- Request interceptor: injects `Authorization: Bearer <token>`, `Account-Id`, and optionally `Badge-Id` headers
- Response interceptor: on 401, attempts token refresh once, then redirects to `/login`

The `Account-Id` and `Badge-Id` values are read from `HeaderStore` (a plain JS singleton in `state/HeaderStore.ts`), not from React state — this is intentional so the Axios interceptors can access them synchronously without React hooks.

### Context Providers

| Context | Responsibility |
|---|---|
| `AuthContext` | Authentication state, login/logout |
| `AccountContext` | Multi-account support, active account, badge (tracing) mode |
| `StatsContext` | Recent stock movement stats, refreshed after each scan |

`AccountContext` keeps `HeaderStore` in sync whenever the active account or badge changes. Tracing mode (badge scanning) is controlled by the `isTracingEnabled` flag stored in `AsyncStorage` after login.

### Scanner

`components/ScannerView.tsx` is the core component. It is mounted permanently under the home screen (`app/(tabs)/index.tsx`), which cross-fades to it: the camera is paused (`pausePreview()` on Android, `active={false}` on iOS) while hidden and resumed through the `open()` / `close()` handle. It uses `expo-camera`'s `CameraView` with a debounce mechanism (a code must be seen in 3 consecutive frames before it triggers) to avoid duplicate scans. The scan flow:

1. If tracing is enabled and no badge is connected → first scan connects a badge
2. Otherwise → scan triggers `ProductService.scan(code, method)` (PUT `/product/stock`)
3. HTTP 409 → prompts the user to force-override expiry date conflict
4. On success/error → plays a sound and vibrates

The `method` (increase/decrease stock) is toggled by `MouvementButton`.

### Environment Configuration

`config/KeycloakConfig.ts` exports `keycloakConfig` and `apiConfig`. It reads from `process.env.EXPO_PUBLIC_*` first (local dev), then falls back to `Constants.expoConfig.extra` (EAS builds). When modifying URLs, update **both** the `.env.*` file and the `env` section in `eas.json` for the corresponding EAS profile.

The path alias `@/` maps to the project root (configured in `vitest.config.ts` and `tsconfig.json`).

### Custom Fonts

Four Montserrat weights are loaded in `app/_layout.tsx` and referenced by family name in styles: `"Montserrat"` (Regular), `"Medium"`, `"SemiBold"`, `"Light"`.
