import { getApp, getApps, initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_APIKEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTHDOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECTID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APPID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENTID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const emulatorState = globalThis as {
  __xrefAuthEmulator?: boolean;
  __xrefFirestoreEmulator?: boolean;
};

function loopbackHost(value: string | null | undefined): string | null {
  if (!value || !/^(127\.0\.0\.1|localhost):\d+$/.test(value)) return null;
  return value;
}

function storedLoopbackHost(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return loopbackHost(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

const authEmulatorHost =
  loopbackHost(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) ||
  storedLoopbackHost("xrefAuthEmulator");
if (authEmulatorHost && !emulatorState.__xrefAuthEmulator) {
  connectAuthEmulator(auth, `http://${authEmulatorHost}`, { disableWarnings: true });
  emulatorState.__xrefAuthEmulator = true;
}

const firestoreEmulatorHost =
  loopbackHost(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST) ||
  storedLoopbackHost("xrefFirestoreEmulator");
if (firestoreEmulatorHost && !emulatorState.__xrefFirestoreEmulator) {
  const [host, portText] = firestoreEmulatorHost.split(":");
  const port = Number(portText);
  if (host && Number.isInteger(port)) {
    connectFirestoreEmulator(db, host, port);
    emulatorState.__xrefFirestoreEmulator = true;
  }
}

export { auth, db, storage };
