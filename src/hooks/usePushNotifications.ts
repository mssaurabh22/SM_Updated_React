import { useEffect, useRef } from "react";
import { onMessage, getToken } from "firebase/messaging";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { useEntitlements } from "../entitlement/EntitlementContext";
import { FIREBASE_VAPID_KEY, getFirebaseMessaging, isPushConfigured } from "../firebase";
import { registerDeviceToken } from "../api/deviceTokensApi";

/**
 * Requests browser notification permission and registers this device's FCM token once per
 * session, only when PUSH_NOTIFICATIONS is entitled for the org and a Firebase project has
 * actually been configured (isPushConfigured()) - a no-op otherwise, same graceful-fallback
 * discipline as the backend's PushNotificationService. The 30s notification poll
 * (notificationsApi.ts's refetchInterval) is left untouched as a fallback for denied-permission/
 * unsupported browsers - this hook only makes the bell update sooner when push does work, via
 * the foreground onMessage handler invalidating the notifications query.
 */
export function usePushNotifications(): void {
  const { isAuthenticated } = useAuth();
  const { hasEntitlement, isLoading } = useEntitlements();
  const queryClient = useQueryClient();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || isLoading || registeredRef.current) {
      return;
    }
    if (!hasEntitlement("PUSH_NOTIFICATIONS") || !isPushConfigured()) {
      return;
    }
    if (!("serviceWorker" in navigator) || typeof Notification === "undefined") {
      return;
    }

    registeredRef.current = true;

    (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          return;
        }
        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        const messaging = getFirebaseMessaging();
        const token = await getToken(messaging, {
          vapidKey: FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        if (token) {
          await registerDeviceToken(token, "WEB");
        }
      } catch {
        // Never fatal - push is an enhancement layered on top of the existing 30s poll, not a
        // requirement for the Notification Center to work.
        registeredRef.current = false;
      }
    })();
  }, [isAuthenticated, isLoading, hasEntitlement]);

  useEffect(() => {
    if (!isPushConfigured()) {
      return;
    }
    // Foreground messages (app tab is focused) don't trigger the service worker's
    // onBackgroundMessage - handled here instead by simply refetching sooner than the next
    // 30s poll tick, reusing the exact same query key notificationsApi.ts already uses.
    const messaging = getFirebaseMessaging();
    const unsubscribe = onMessage(messaging, () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    return unsubscribe;
  }, [queryClient]);
}
