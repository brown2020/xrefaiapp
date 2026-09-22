# CI secrets

Wire these as GitHub Actions repository secrets. Never inline values in workflow YAML.

- `NEXT_PUBLIC_FIREBASE_APIKEY`
- `NEXT_PUBLIC_FIREBASE_AUTHDOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECTID`
- `NEXT_PUBLIC_FIREBASE_STORAGEBUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID`
- `NEXT_PUBLIC_FIREBASE_APPID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENTID`
- `NEXT_PUBLIC_COOKIE_NAME` (optional; app defaults to `xrefAuthToken`)
- `NEXT_PUBLIC_STRIPE_PRODUCT_NAME` (optional for build)

Gate jobs (lint/typecheck) must not require secrets. Production build uses `${{ secrets.* }}` on the build step only; deferred Firebase client init tolerates empty values.
