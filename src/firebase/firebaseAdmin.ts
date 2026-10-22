import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

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

function usesEmulator(): boolean {
  return (
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)
  );
}

/** True when Admin can verify tokens: an emulator, or the service-account fields the cert needs. */
export function isAdminConfigured(): boolean {
  if (usesEmulator()) return true;
  return Boolean(
    adminCredentials.projectId?.trim() &&
      adminCredentials.clientEmail?.trim() &&
      adminCredentials.privateKey?.trim()
  );
}

let initialized = false;
function ensureInitialized(): void {
  if (initialized || getApps().length > 0) {
    initialized = true;
    return;
  }
  if (usesEmulator()) {
    const projectId = process.env.FIREBASE_PROJECT_ID || "demo-xref";
    // Only point Storage at a bucket when its emulator is running; NEXT_PUBLIC_*
    // is inlined at build time and would name the production bucket here.
    initializeApp({
      projectId,
      ...(process.env.FIREBASE_STORAGE_EMULATOR_HOST
        ? { storageBucket: `${projectId}.appspot.com` }
        : {}),
    });
  } else {
    initializeApp({
      credential: cert(adminCredentials as ServiceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGEBUCKET,
    });
  }
  initialized = true;
}

export const adminDb: Firestore = new Proxy(
  {} as Firestore,
  {
    get(_, prop) {
      ensureInitialized();
      const db = getFirestore();
      const value = (db as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(db) : value;
    },
  }
);

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    ensureInitialized();
    const auth = getAuth();
    const value = (auth as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(auth) : value;
  },
});

export const adminBucket = new Proxy(
  {} as ReturnType<ReturnType<typeof getStorage>["bucket"]>,
  {
    get(_, prop) {
      ensureInitialized();
      const bucket = getStorage().bucket();
      const value = (bucket as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(bucket)
        : value;
    },
  }
);
