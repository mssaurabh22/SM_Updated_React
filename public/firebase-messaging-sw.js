// Firebase's officially documented pattern for background push handling: a service worker
// can't easily use Vite's bundled ES modules / import.meta.env, so it loads the "compat" SDK
// via importScripts and reads a plain, hardcoded config object instead. These values are NOT
// secret (a Firebase web app's config is meant to be public), but they DO need to be kept in
// sync by hand with the VITE_FIREBASE_* values in .env/.env.production whenever they change,
// since this file is served as a static, unprocessed asset (see vite.config's public dir),
// never passed through Vite's env-var substitution.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "REPLACE_WITH_VITE_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_VITE_FIREBASE_PROJECT_ID",
  storageBucket: "REPLACE_WITH_VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_VITE_FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

// The backend always sends a DATA-only message (see PushNotificationService's javadoc) - no
// automatic OS notification is shown for a data message, so it must be built manually here.
// This deliberately duplicates a SMALL, generic subset of notificationFormat.ts's per-type
// labels (not the full describeNotification() rich-text logic) - a background service worker
// runs in complete isolation from the page's React/TypeScript module graph, so importing that
// file directly isn't possible; the full rich message is still what's shown once the user
// actually opens the app (bell dropdown / Notifications page), this is only the OS alert text.
const TYPE_LABELS = {
  LEAD_REASSIGNED: "Lead Reassigned",
  VISIT_MISSED: "Visit Missed",
  LEAD_LAPSED: "Lead Lapsed",
  LEAD_LAPSED_DIGEST: "Leads Lapsed",
  LEAVE_REQUEST_SUBMITTED: "Leave Request Submitted",
  LEAVE_REQUEST_APPROVED: "Leave Request Approved",
  LEAVE_REQUEST_REJECTED: "Leave Request Rejected",
  LOW_STOCK: "Low Stock",
};

messaging.onBackgroundMessage((payload) => {
  const type = payload.data && payload.data.type;
  const title = TYPE_LABELS[type] || "SalesManager CRM";
  self.registration.showNotification(title, {
    body: "You have a new notification - open the app to view details.",
    icon: "/favicon.svg",
    data: payload.data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/app/notifications"));
});
