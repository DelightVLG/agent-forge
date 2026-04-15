# App Store / Google Play Publishing

Rules and patterns for publishing mobile apps. Apply on top of `expo.md` and
`conventions.md`.

## Rules

- **EAS Submit for automation.** Use `eas submit` to upload builds to App Store
  Connect and Google Play Console. Never upload manually via browser.
- **Separate signing keys.** Use an upload key for Google Play (not the app
  signing key). Let Google Play App Signing manage the release key. For iOS, let
  EAS manage certificates and provisioning profiles.
- **Internal testing first.** Every release goes through internal testing
  (TestFlight / Internal Testing Track) before public submission. No exceptions.
- **Version bumping is explicit.** Bump `version` (semver) in `app.config.ts`
  for user-facing releases. Auto-increment `buildNumber` / `versionCode` via
  EAS. Never reuse a build number.
- **Screenshots and metadata in source control.** Store store listing assets
  (screenshots, descriptions, changelogs) in a `store/` directory. Update them
  alongside code changes.
- **Review guidelines before submission.** Check Apple's App Review Guidelines
  and Google Play policies before each submission. Common rejection reasons:
  missing privacy policy, incomplete metadata, broken deep links.
- **Staged rollouts for production.** Use phased releases (iOS) or staged
  rollouts (Android) for production deploys. Start at 10-20% and monitor crash
  rates before going to 100%.
- **Privacy policy and data safety.** Both stores require a privacy policy URL
  and data collection declarations. Keep them updated when adding new
  permissions or analytics.
- **No secrets in builds.** API keys, tokens, and credentials are injected at
  runtime or via EAS secrets. Never bake them into the binary.

## Patterns

### EAS Submit configuration

```json
// eas.json (submit section)
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@company.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      },
      "android": {
        "serviceAccountKeyPath": "./credentials/google-sa-key.json",
        "track": "internal"
      }
    }
  }
}
```

### Full release workflow

```bash
# 1. Bump version in app.config.ts
# version: "1.3.0"

# 2. Build for both platforms
eas build --platform all --profile production

# 3. Submit to stores (internal testing)
eas submit --platform ios --profile production
eas submit --platform android --profile production

# 4. After internal testing approval:
# iOS: promote from TestFlight to App Store (via App Store Connect)
# Android: promote from internal → closed → production track

# 5. Monitor: check crash rates, reviews, and analytics
```

### Version management in config

```typescript
// app.config.ts
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  version: "1.3.0", // user-facing version — bump manually
  ios: {
    bundleIdentifier: "com.company.myapp",
    buildNumber: "1", // auto-incremented by EAS
  },
  android: {
    package: "com.company.myapp",
    versionCode: 1, // auto-incremented by EAS
  },
});
```

```json
// eas.json — auto-increment per profile
{
  "build": {
    "production": {
      "autoIncrement": "buildNumber"
    }
  }
}
```

### Store assets directory structure

```
store/
  ios/
    screenshots/
      6.7-inch/          # iPhone 15 Pro Max
        01-home.png
        02-profile.png
        03-settings.png
      6.1-inch/          # iPhone 15 Pro
      12.9-inch/         # iPad Pro
    description.txt
    keywords.txt
    release-notes.txt
  android/
    screenshots/
      phone/
        01-home.png
        02-profile.png
      tablet-7/
      tablet-10/
    description.txt
    short-description.txt
    release-notes.txt
  shared/
    privacy-policy-url.txt
    support-url.txt
    marketing-url.txt
```

### Google Play service account setup

```bash
# 1. Create a service account in Google Cloud Console
# 2. Grant access in Google Play Console:
#    Setup → API access → Link project → Grant "Release manager" to SA
# 3. Download JSON key and store securely

# For CI/CD, use EAS secrets:
eas secret:create --name GOOGLE_SERVICE_ACCOUNT_KEY \
  --value "$(cat ./credentials/google-sa-key.json)" \
  --type file
```

### Staged rollout strategy

```bash
# Android: submit to production track with staged rollout
# In Google Play Console:
# 1. Create release on Production track
# 2. Set rollout percentage: 10%
# 3. Monitor crash rate for 24-48h
# 4. Increase to 50% if stable
# 5. Full rollout at 100%

# iOS: phased release
# In App Store Connect:
# 1. Submit for review
# 2. After approval, select "Phased Release"
# 3. Apple rolls out over 7 days (1%, 2%, 5%, 10%, 20%, 50%, 100%)
# 4. Can pause or complete early
```

### Pre-submission checklist script

```bash
#!/bin/bash
# scripts/pre-submit-check.sh

echo "=== Pre-Submission Checklist ==="

# Check version was bumped
echo "Current version: $(node -e "console.log(require('./app.json').expo.version)")"
echo "→ Did you bump the version? (y/n)"

# Verify no debug/dev flags
echo "Checking for debug flags..."
grep -r "DEV_MODE\|__DEV__.*true\|enableDebug" src/ && echo "⚠️  Debug flags found!" || echo "✓ No debug flags"

# Check privacy policy URL is set
echo "Checking privacy policy..."
grep -q "privacyUrl" app.config.ts && echo "✓ Privacy policy configured" || echo "⚠️  Missing privacy policy URL"

# Verify store assets exist
echo "Checking store assets..."
[ -d "store/ios/screenshots" ] && echo "✓ iOS screenshots exist" || echo "⚠️  Missing iOS screenshots"
[ -d "store/android/screenshots" ] && echo "✓ Android screenshots exist" || echo "⚠️  Missing Android screenshots"

echo "=== Done ==="
```

## Anti-patterns

```bash
# ❌ Manual upload via browser
# Drag .ipa to App Store Connect website

# ✅ Automated via EAS Submit
eas submit --platform ios --profile production
```

```bash
# ❌ Skipping internal testing
eas build --platform all --profile production
eas submit --platform all --profile production
# → immediately promote to public

# ✅ Internal testing → review → staged rollout
eas submit --platform android --profile production  # goes to internal track
# → test → promote to closed testing → promote to production at 10%
```

```typescript
// ❌ Hardcoded API key in binary
export const config = {
  apiKey: "sk-live-abc123", // baked into the JS bundle
};

// ✅ Runtime injection via EAS secrets + expo-constants
export const config = {
  apiKey: Constants.expoConfig?.extra?.apiKey,
};
```

```typescript
// ❌ Reusing build numbers
// app.config.ts
ios: { buildNumber: "42" }, // same as last build — rejected by App Store

// ✅ Auto-increment
// eas.json
{ "build": { "production": { "autoIncrement": "buildNumber" } } }
```

```bash
# ❌ Full rollout without monitoring
# Promote to 100% immediately after approval

# ✅ Staged rollout
# Start at 10%, monitor crash rates for 24-48h, then increase
```

## Checklist

- [ ] `eas submit` configured for both platforms in `eas.json`
- [ ] Signing managed by EAS (iOS) and Google Play App Signing (Android)
- [ ] `version` bumped in `app.config.ts` for user-facing releases
- [ ] `buildNumber` / `versionCode` auto-incremented via EAS
- [ ] Build submitted to internal testing track first
- [ ] Store screenshots and metadata in source control
- [ ] Privacy policy URL set and up-to-date
- [ ] Data safety / App Privacy declarations match actual data collection
- [ ] No secrets or API keys baked into the binary
- [ ] Staged rollout configured — not 100% on day one
- [ ] Release notes written for this version
- [ ] Pre-submission checklist verified (debug flags, deep links, permissions)
