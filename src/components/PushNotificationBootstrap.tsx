import { usePushNotifications } from "../hooks/usePushNotifications";

/** Renders nothing - exists purely to call usePushNotifications from within both
 * AuthProvider and EntitlementProvider's context (see App.tsx). */
export function PushNotificationBootstrap() {
  usePushNotifications();
  return null;
}
