import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, type Messaging } from "firebase/messaging";

/** All of these are PUBLIC web config values (not secrets) - safe to ship in the built
 * bundle, same as any Firebase web app. Left unset in an environment that hasn't created
 * a Firebase project yet - isPushConfigured() lets usePushNotifications no-op gracefully
 * instead of throwing, mirroring PushNotificationService's own server-side fallback. */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const FIREBASE_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as
  | string
  | undefined;

export function isPushConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && FIREBASE_VAPID_KEY);
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/** Lazily initialized - calling this when isPushConfigured() is false would throw, so
 * every caller (usePushNotifications) must check that first. */
export function getFirebaseMessaging(): Messaging {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}
