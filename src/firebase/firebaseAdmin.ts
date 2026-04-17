import admin from "firebase-admin";
import { getApps } from "firebase-admin/app";

/**
 * Firebase Admin SDK singleton.
 *
 * Initializes lazily on first use so that:
 * - App Router build / prerender steps don't crash if creds are missing.
 * - Route handlers that don't touch Firestore never fail at module load.
 */
const adminCredentials = {
  type: process.env.FIREBASE_TYPE,
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  clientId: process.env.FIREBASE_CLIENT_ID,
  authUri: process.env.FIREBASE_AUTH_URI,
  tokenUri: process.env.FIREBASE_TOKEN_URI,
  authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  clientCertsUrl: process.env.FIREBASE_CLIENT_CERTS_URL,
};

let initialized = false;
function ensureInitialized(): void {
  if (initialized || getApps().length > 0) {
    initialized = true;
    return;
  }
  admin.initializeApp({
    credential: admin.credential.cert(adminCredentials as admin.ServiceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGEBUCKET,
  });
  initialized = true;
}

export const adminDb: admin.firestore.Firestore = new Proxy(
  {} as admin.firestore.Firestore,
  {
    get(_, prop) {
      ensureInitialized();
      const db = admin.firestore();
      const value = (db as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(db) : value;
    },
  }
);

export const adminAuth: admin.auth.Auth = new Proxy({} as admin.auth.Auth, {
  get(_, prop) {
    ensureInitialized();
    const auth = admin.auth();
    const value = (auth as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(auth) : value;
  },
});

export const adminBucket = new Proxy(
  {} as ReturnType<ReturnType<typeof admin.storage>["bucket"]>,
  {
    get(_, prop) {
      ensureInitialized();
      const bucket = admin.storage().bucket();
      const value = (bucket as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(bucket)
        : value;
    },
  }
);

export { admin };
