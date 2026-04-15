# Expo

Rules and patterns for Expo-based React Native projects. Apply on top of
`react-native.md` and `conventions.md`.

## Rules

- **Managed workflow by default.** Stay in the managed workflow unless a native
  module absolutely requires bare. Use config plugins to extend native code
  without ejecting.
- **`app.config.ts` over `app.json`.** Use the TypeScript config for dynamic
  values (environment-based bundle IDs, versioning, feature flags). Export a
  function from `app.config.ts` when you need runtime logic.
- **EAS Build for all builds.** Never build locally for distribution. Use EAS
  Build profiles: `development` (dev client), `preview` (internal testing),
  `production` (store submission).
- **EAS Update for OTA patches.** Ship JS-only fixes via `eas update` without a
  full rebuild. Pin updates to channels (`preview`, `production`) and never push
  breaking native changes via OTA.
- **Environment variables via `eas.json` + `app.config.ts`.** Set env vars per
  build profile in `eas.json`. Access them in `app.config.ts` via `process.env`.
  For runtime config, use `expo-constants`.
- **Expo SDK modules first.** Use `expo-camera`, `expo-location`,
  `expo-notifications` etc. before reaching for community packages. They're
  maintained, typed, and config-plugin-ready.
- **Config plugins for native changes.** Modify `Info.plist`, `AndroidManifest`,
  Gradle, or Podfile via config plugins — never edit native files directly in
  managed workflow.
- **Versioning strategy.** Auto-increment `buildNumber` / `versionCode` in
  `eas.json` with `autoIncrement`. Keep `version` (semver) in `app.config.ts`
  and bump manually for user-facing releases.
- **Splash screen and icons via config.** Define in `app.config.ts` under
  `splash` and `icon` — Expo generates all required sizes.

## Patterns

### Dynamic app config

```typescript
// app.config.ts
import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.APP_ENV === "production" ? "MyApp" : "MyApp (Dev)",
  slug: "my-app",
  version: "1.2.0",
  ios: {
    bundleIdentifier:
      process.env.APP_ENV === "production"
        ? "com.company.myapp"
        : "com.company.myapp.dev",
    buildNumber: "1",
  },
  android: {
    package:
      process.env.APP_ENV === "production"
        ? "com.company.myapp"
        : "com.company.myapp.dev",
    versionCode: 1,
  },
  extra: {
    apiUrl: process.env.API_URL ?? "http://localhost:4000",
    eas: {
      projectId: "your-project-id",
    },
  },
  plugins: [
    "expo-router",
    [
      "expo-camera",
      { cameraPermission: "Allow $(PRODUCT_NAME) to access the camera." },
    ],
  ],
});
```

### EAS Build profiles

```json
// eas.json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_ENV": "development",
        "API_URL": "http://localhost:4000"
      }
    },
    "preview": {
      "distribution": "internal",
      "autoIncrement": "buildNumber",
      "env": {
        "APP_ENV": "preview",
        "API_URL": "https://api-staging.example.com"
      }
    },
    "production": {
      "autoIncrement": "buildNumber",
      "env": {
        "APP_ENV": "production",
        "API_URL": "https://api.example.com"
      }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "team@company.com", "ascAppId": "123456789" },
      "android": { "serviceAccountKeyPath": "./google-sa-key.json" }
    }
  }
}
```

### Runtime config access

```typescript
// lib/config.ts
import Constants from "expo-constants";

interface AppConfig {
  apiUrl: string;
}

export const config: AppConfig = {
  apiUrl: Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:4000",
};
```

### Config plugin example

```typescript
// plugins/with-background-modes.ts
import { withInfoPlist, type ConfigPlugin } from "expo/config-plugins";

const withBackgroundModes: ConfigPlugin<string[]> = (config, modes) => {
  return withInfoPlist(config, (modConfig) => {
    modConfig.modResults.UIBackgroundModes = modes;
    return modConfig;
  });
};

export default withBackgroundModes;
```

```typescript
// app.config.ts
plugins: [
  ["./plugins/with-background-modes", ["location", "fetch"]],
],
```

### EAS Update workflow

```bash
# Push OTA update to preview channel
eas update --branch preview --message "Fix login validation"

# Push to production channel
eas update --branch production --message "Fix crash on empty cart"

# Check update status
eas update:list
```

## Anti-patterns

```typescript
// ❌ Hardcoded config in app.json — can't vary by environment
{
  "expo": {
    "name": "MyApp",
    "extra": {
      "apiUrl": "https://api.example.com"
    }
  }
}

// ✅ Dynamic config in app.config.ts
export default ({ config }) => ({
  ...config,
  extra: {
    apiUrl: process.env.API_URL ?? "http://localhost:4000",
  },
});
```

```typescript
// ❌ Editing native files directly in managed workflow
// ios/MyApp/Info.plist — manual edit

// ✅ Config plugin
withInfoPlist(config, (mod) => {
  mod.modResults.NSCameraUsageDescription = "Camera access for scanning";
  return mod;
});
```

```bash
# ❌ Local builds for distribution
npx react-native run-ios --configuration Release

# ✅ EAS Build
eas build --platform ios --profile production
```

```typescript
// ❌ OTA update with native dependency changes — will crash
// Added new native module, then ran:
eas update --branch production

// ✅ Native changes require a full build
eas build --platform all --profile production
// Then: eas update for JS-only changes
```

```typescript
// ❌ Community package when Expo SDK has it
import * as ImagePicker from "react-native-image-picker";

// ✅ Expo SDK module — maintained, config-plugin-ready
import * as ImagePicker from "expo-image-picker";
```

## Checklist

- [ ] Using managed workflow — no ejected native code
- [ ] `app.config.ts` used for dynamic configuration
- [ ] EAS Build profiles for development, preview, and production
- [ ] Environment variables set per profile in `eas.json`
- [ ] Runtime config accessed via `expo-constants`
- [ ] Expo SDK modules preferred over community alternatives
- [ ] Native customizations via config plugins, not manual edits
- [ ] `buildNumber` / `versionCode` auto-incremented via EAS
- [ ] OTA updates only for JS-only changes
- [ ] Splash screen and icons configured in `app.config.ts`
