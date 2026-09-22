/**
 * Firebase, loaded on demand and only in the browser.
 *
 * Nothing in here runs at import time and no route module imports the SDK
 * directly: every entry point is an async function that `import()`s the SDK
 * the first time it is actually needed. That is deliberate. The site's
 * standing guarantee is that no request leaves the origin on any route —
 * self-hosted fonts, no CDN, no beacon — and a static `import "firebase/app"`
 * inside a component would put the SDK in a shared chunk for every visitor,
 * including the ones who never open the form. Loading it from the submit
 * handler keeps that guarantee true everywhere except the one action that has
 * to talk to a server.
 *
 * Firestore is imported from `firebase/firestore/lite`, not the full client.
 * The site writes registrations and never subscribes to anything, so the
 * realtime client's WebChannel transport, listener machinery and offline
 * cache would be several hundred kilobytes bought to do a single POST. The
 * lite build is plain REST.
 *
 * The config comes from VITE_ variables, which Vite inlines at build time.
 * None of it is a secret: a Firebase web config ships in every client bundle
 * by design, and `apiKey` identifies the project rather than authorising
 * anything. What actually protects the data is `firestore.rules` plus, where
 * it is configured, App Check. Anyone reading this and reaching for
 * `.env.local` to hide the apiKey is solving a problem that does not exist
 * and leaving the one that does.
 */

import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Firestore } from "firebase/firestore/lite";

/**
 * `import.meta.env` is typed with an index signature, and this project has
 * `noPropertyAccessFromIndexSignature` on, so these are read by key.
 */
function env(key: string): string {
  const value = import.meta.env[key];
  return typeof value === "string" ? value.trim() : "";
}

function flag(key: string): boolean {
  return env(key).toLowerCase() === "true";
}

/** Everything Firestore needs. The rest of `FirebaseOptions` is optional. */
export type FirebaseConfig = FirebaseOptions & {
  apiKey: string;
  projectId: string;
  appId: string;
};

/** `undefined` means "not read yet"; `null` means "read, and not configured". */
let configCache: FirebaseConfig | null | undefined;

/**
 * The project config, or null when the deployment has not been given one.
 *
 * Only apiKey, projectId and appId are required — those are what the
 * Firestore REST transport needs. authDomain is derived rather than demanded,
 * because it is only load-bearing for Auth, which this site does not use, and
 * an integration that refuses to start over an unused field is an integration
 * people disable.
 */
export function firebaseConfig(): FirebaseConfig | null {
  if (configCache !== undefined) return configCache;

  const apiKey = env("VITE_FIREBASE_API_KEY");
  const projectId = env("VITE_FIREBASE_PROJECT_ID");
  const appId = env("VITE_FIREBASE_APP_ID");

  if (!apiKey || !projectId || !appId) {
    configCache = null;
    return configCache;
  }

  const config: FirebaseConfig = {
    apiKey,
    projectId,
    appId,
    authDomain: env("VITE_FIREBASE_AUTH_DOMAIN") || `${projectId}.firebaseapp.com`,
  };

  const storageBucket = env("VITE_FIREBASE_STORAGE_BUCKET");
  if (storageBucket) config.storageBucket = storageBucket;
  const messagingSenderId = env("VITE_FIREBASE_MESSAGING_SENDER_ID");
  if (messagingSenderId) config.messagingSenderId = messagingSenderId;
  const measurementId = env("VITE_FIREBASE_MEASUREMENT_ID");
  if (measurementId) config.measurementId = measurementId;

  configCache = config;
  return configCache;
}

export function isFirebaseConfigured(): boolean {
  return firebaseConfig() !== null;
}

/** Thrown rather than returned so a missing config can never read as a success. */
export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("Firebase is not configured: set VITE_FIREBASE_API_KEY, _PROJECT_ID and _APP_ID.");
    this.name = "FirebaseNotConfiguredError";
  }
}

let appPromise: Promise<FirebaseApp> | null = null;

export async function getFirebaseApp(): Promise<FirebaseApp> {
  const config = firebaseConfig();
  if (!config) throw new FirebaseNotConfiguredError();

  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApp, getApps } = await import("firebase/app");
      const app = getApps().length > 0 ? getApp() : initializeApp(config);
      await startAppCheck(app);
      return app;
    })().catch((error: unknown) => {
      // Do not cache a failed boot: a reCAPTCHA script blocked by a school
      // network should not poison every later submit on the same page.
      appPromise = null;
      throw error;
    });
  }

  return appPromise;
}

let dbPromise: Promise<Firestore> | null = null;

export async function getDb(): Promise<Firestore> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const app = await getFirebaseApp();
      const { connectFirestoreEmulator, getFirestore } = await import("firebase/firestore/lite");
      const db = getFirestore(app);

      // Point the form at a local emulator with
      // VITE_FIREBASE_EMULATOR_HOST=127.0.0.1:8181 and any placeholder
      // credentials. It is the only way to exercise a real submit — including
      // firestore.rules, which is where the duplicate check actually lives —
      // without writing a test entry into the registration collection the
      // organisers are reading.
      const emulator = env("VITE_FIREBASE_EMULATOR_HOST");
      if (emulator) {
        const [host, port] = emulator.split(":");
        connectFirestoreEmulator(db, host || "127.0.0.1", Number(port) || 8080);
      }

      return db;
    })().catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

/**
 * App Check, when a site key is configured.
 *
 * Writes to `registrations` are open to anyone with the project id — that is
 * what an unauthenticated public form is — so rules can check the *shape* of
 * an entry but not who sent it. App Check is what raises the cost of a script
 * filling the sheet with a thousand valid-looking teams. It is optional
 * because turning it on requires a reCAPTCHA v3 key and an enforcement switch
 * in the console, and a half-configured App Check rejects real registrations.
 *
 * A failure here is logged and swallowed. If enforcement is on, the write
 * fails anyway and the form reports that honestly; if it is off, a blocked
 * reCAPTCHA script must not take the form down with it.
 */
async function startAppCheck(app: FirebaseApp): Promise<void> {
  const siteKey = env("VITE_FIREBASE_APPCHECK_SITE_KEY");
  if (!siteKey || typeof window === "undefined") return;

  try {
    const debugToken = env("VITE_FIREBASE_APPCHECK_DEBUG_TOKEN");
    if (debugToken) {
      (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
        debugToken;
    }
    const { initializeAppCheck, ReCaptchaV3Provider } = await import("firebase/app-check");
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.warn("App Check did not start", error);
  }
}

/**
 * Analytics, off unless VITE_FIREBASE_ANALYTICS is exactly "true".
 *
 * Default off on purpose. Analytics loads gtag from Google's servers on every
 * route, which breaks the site's "no third-party requests" property and the
 * test that asserts it. Switching it on is a decision with a privacy notice
 * attached, not a default.
 */
export async function startAnalytics(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!flag("VITE_FIREBASE_ANALYTICS")) return;
  if (!env("VITE_FIREBASE_MEASUREMENT_ID")) return;

  try {
    const app = await getFirebaseApp();
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (!(await isSupported())) return;
    getAnalytics(app);
  } catch (error) {
    console.warn("Analytics did not start", error);
  }
}
