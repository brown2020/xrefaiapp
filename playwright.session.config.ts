import { defineConfig } from "@playwright/test";
import {
  SESSION_AUTH_HOST,
  SESSION_FIRESTORE_HOST,
  SESSION_PROJECT_ID,
} from "./tests-session/emulator";

/**
 * Signed-in session tests against the Firebase Auth and Firestore emulators.
 * The web server builds a production bundle pointed at the emulators, so it
 * replaces `.next`; run `npm run build` again before `npm run start`.
 */
const port = 3331;
const baseURL = `http://127.0.0.1:${port}`;

const emulatorClientEnv = {
  NEXT_PUBLIC_FIREBASE_APIKEY: "demo-key",
  NEXT_PUBLIC_FIREBASE_AUTHDOMAIN: `${SESSION_PROJECT_ID}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECTID: SESSION_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGEBUCKET: `${SESSION_PROJECT_ID}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID: "1",
  NEXT_PUBLIC_FIREBASE_APPID: "1:1:web:1",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: SESSION_AUTH_HOST,
  NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: SESSION_FIRESTORE_HOST,
};

export default defineConfig({
  testDir: "./tests-session",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `npx -y firebase-tools@15.36.0 emulators:start --only auth,firestore --project ${SESSION_PROJECT_ID} --config firebase.session.json`,
      url: `http://${SESSION_FIRESTORE_HOST}/`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `env -u FORCE_COLOR -u NO_COLOR sh -c "npm run build && npm run start -- --hostname 127.0.0.1 --port ${port}"`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 600_000,
      env: {
        ...emulatorClientEnv,
        FIREBASE_PROJECT_ID: SESSION_PROJECT_ID,
        FIREBASE_AUTH_EMULATOR_HOST: SESSION_AUTH_HOST,
        FIRESTORE_EMULATOR_HOST: SESSION_FIRESTORE_HOST,
      },
    },
  ],
});
