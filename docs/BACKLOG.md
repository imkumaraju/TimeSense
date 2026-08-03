# TimeSense backlog

## Deferred: Sign in with Apple

**Parked:** 2026-08-03

**Why deferred:** No iOS device available for testing right now. Android (and web) Apple OAuth also requires an Apple Developer Services ID plus JWT secret configuration before it can work end-to-end.

**Setup guide:** [supabase/SOCIAL_AUTH_SETUP.txt](../supabase/SOCIAL_AUTH_SETUP.txt)

App-side `signInWithApple` in `stores/authStore.ts` and OAuth helpers remain in place; only the auth-screen button is hidden.

### Remaining work

- [ ] **Supabase Apple Client IDs:** `host.exp.Exponent,com.timesense.dev,com.timesense.sys,com.timesense` (retire `com.timesense.app`)
- [ ] **URL Configuration redirects** (Site URL + additional redirect URLs per setup guide)
- [ ] **Apple Developer:** Enable Sign in with Apple on App IDs `com.timesense.dev`, `com.timesense.sys`, `com.timesense`
- [ ] **Optional (Android / web):** Services ID, Return URL (Supabase callback), `.p8` key, Team ID, Key ID, JWT secret in Supabase
- [ ] **Re-enable Apple button** in `app/auth/index.tsx` (restore availability check + button JSX)
- [ ] **Test on real iPhone** (Expo Go + EAS build)
- [ ] **Optional:** Official `AppleAuthenticationButton` / HIG styling
