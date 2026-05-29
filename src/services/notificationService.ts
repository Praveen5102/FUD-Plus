// services/notificationService.ts
import * as ExpoNotifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants"; // ← ADD THIS IMPORT
import { Platform } from "react-native";
import { supabase } from "./supabase";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type NotificationType =
  | "attendance"
  | "leave"
  | "broadcast"
  | "holiday"
  | "checkout_reminder"
  | "late_login"
  | "system"
  | "admin_alert";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SendNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
}

// ─── EXPO NOTIFICATION CONFIG ─────────────────────────────────────────────────
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── REGISTER PUSH TOKEN ──────────────────────────────────────────────────────
export async function registerForPushNotifications(
  userId: string,
): Promise<string | null> {
  // Must be a real physical device
  if (!Device.isDevice) {
    console.warn(
      "[Notifications] Push notifications require a physical device.",
    );
    return null;
  }

  // ── FIX 1: Expo Go SDK 53 guard ─────────────────────────────────────────
  // Remote push notifications were removed from Expo Go in SDK 53.
  // Bail out silently instead of crashing with the token error.
  const isExpoGo = Constants.appOwnership === "expo";
  if (isExpoGo) {
    console.warn(
      "[Notifications] Remote push not supported in Expo Go SDK 53+. Use a development build.",
    );
    return null;
  }

  // Android notification channel
  if (Platform.OS === "android") {
    await ExpoNotifications.setNotificationChannelAsync("fud-plus", {
      name: "FUD Plus",
      importance: ExpoNotifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3b82f6",
      sound: "default",
    });
  }

  // Request permissions
  const { status: existingStatus } =
    await ExpoNotifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[Notifications] Push notification permission denied.");
    return null;
  }

  // ── FIX 2: Read projectId correctly from app config ──────────────────────
  // process.env.EXPO_PUBLIC_PROJECT_ID is NOT reliably available at runtime.
  // Constants reads directly from the compiled app manifest — always works.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? // app.json → extra.eas.projectId
    Constants.easConfig?.projectId; // eas.json fallback

  if (!projectId) {
    console.error(
      "[Notifications] projectId missing. Add it to app.json:\n" +
        '  "extra": { "eas": { "projectId": "your-id-here" } }',
    );
    return null;
  }

  try {
    const tokenData = await ExpoNotifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;

    // Store token in Supabase profiles table
    const { error } = await supabase
      .from("profiles")
      .update({ expo_push_token: token })
      .eq("id", userId);

    if (error) {
      console.error("[Notifications] Failed to store push token:", error);
    } else {
      console.log(
        "[Notifications] Push token registered:",
        token.slice(0, 20) + "...",
      );
    }

    return token;
  } catch (err) {
    console.error("[Notifications] getExpoPushTokenAsync failed:", err);
    return null;
  }
}

// ─── CREATE IN-APP NOTIFICATION (DB) ─────────────────────────────────────────
export async function createNotification(
  payload: SendNotificationPayload,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      reference_id: payload.referenceId ?? null,
    });
    if (error) {
      console.error("[Notifications] DB insert failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Notifications] createNotification error:", err);
    return false;
  }
}

// ─── SEND PUSH NOTIFICATION VIA EXPO API ─────────────────────────────────────
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!expoPushToken?.startsWith("ExponentPushToken")) return;

  const message = {
    to: expoPushToken,
    sound: "default" as const,
    title,
    body,
    data: data ?? {},
    badge: 1,
    channelId: "fud-plus",
  };

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    const json = await res.json();
    if (json?.data?.status === "error") {
      console.error("[Notifications] Expo push error:", json.data.message);
    }
  } catch (err) {
    console.error("[Notifications] sendPushNotification fetch error:", err);
  }
}

// ─── SEND FULL NOTIFICATION (DB + PUSH) ──────────────────────────────────────
export async function sendFullNotification(
  payload: SendNotificationPayload & { expoPushToken?: string | null },
): Promise<void> {
  // 1. Write to DB (triggers realtime)
  await createNotification(payload);

  // 2. Send push if token available
  if (payload.expoPushToken) {
    await sendPushNotification(
      payload.expoPushToken,
      payload.title,
      payload.message,
      { type: payload.type, referenceId: payload.referenceId },
    );
  }
}

// ─── CONVENIENCE: NOTIFY ALL ADMINS ──────────────────────────────────────────
export async function notifyAdmins(
  title: string,
  message: string,
  type: NotificationType = "admin_alert",
  referenceId?: string,
): Promise<void> {
  try {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, expo_push_token")
      .eq("role", "admin");

    if (!admins?.length) return;

    await Promise.all(
      admins.map((admin) =>
        sendFullNotification({
          userId: admin.id,
          title,
          message,
          type,
          referenceId,
          expoPushToken: admin.expo_push_token,
        }),
      ),
    );
  } catch (err) {
    console.error("[Notifications] notifyAdmins error:", err);
  }
}

// ─── CONVENIENCE: NOTIFY EMPLOYEE ─────────────────────────────────────────────
export async function notifyEmployee(
  employeeId: string,
  title: string,
  message: string,
  type: NotificationType,
  referenceId?: string,
): Promise<void> {
  try {
    const { data: emp } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .eq("id", employeeId)
      .maybeSingle();

    await sendFullNotification({
      userId: employeeId,
      title,
      message,
      type,
      referenceId,
      expoPushToken: emp?.expo_push_token,
    });
  } catch (err) {
    console.error("[Notifications] notifyEmployee error:", err);
  }
}

// ─── SCHEDULE LOCAL CHECKOUT REMINDER (8 hours after check-in) ───────────────
export async function scheduleCheckoutReminder(
  checkInTime: Date,
): Promise<string | null> {
  try {
    // Cancel any existing checkout reminder
    await cancelCheckoutReminder();

    const triggerTime = new Date(checkInTime.getTime() + 8 * 60 * 60 * 1000);
    const secondsUntil = Math.floor(
      (triggerTime.getTime() - Date.now()) / 1000,
    );

    if (secondsUntil <= 0) return null; // Already past 8 hours

    const id = await ExpoNotifications.scheduleNotificationAsync({
      content: {
        title: "Checkout Reminder ⏰",
        body: "You have completed 8 working hours. Please check out.",
        sound: "default",
        data: { type: "checkout_reminder" },
        badge: 1,
      },
      trigger: { seconds: secondsUntil, channelId: "fud-plus" },
    });

    console.log(
      "[Notifications] Checkout reminder scheduled in",
      secondsUntil,
      "seconds. ID:",
      id,
    );
    return id;
  } catch (err) {
    console.error("[Notifications] scheduleCheckoutReminder error:", err);
    return null;
  }
}

// ─── CANCEL CHECKOUT REMINDER ─────────────────────────────────────────────────
export async function cancelCheckoutReminder(): Promise<void> {
  try {
    const scheduled =
      await ExpoNotifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if ((notif.content.data as any)?.type === "checkout_reminder") {
        await ExpoNotifications.cancelScheduledNotificationAsync(
          notif.identifier,
        );
      }
    }
  } catch (err) {
    console.error("[Notifications] cancelCheckoutReminder error:", err);
  }
}

// ─── MARK NOTIFICATION AS READ ────────────────────────────────────────────────
export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}

// ─── MARK ALL AS READ ─────────────────────────────────────────────────────────
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  // Clear badge
  await ExpoNotifications.setBadgeCountAsync(0);
}

// ─── FETCH UNREAD COUNT ───────────────────────────────────────────────────────
export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}

// ─── NOTIFICATION ICONS BY TYPE ───────────────────────────────────────────────
export const NOTIFICATION_META: Record<
  NotificationType,
  { icon: string; color: string; bg: string; label: string }
> = {
  attendance: {
    icon: "checkmark-circle",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
    label: "Attendance",
  },
  leave: {
    icon: "calendar",
    color: "#c084fc",
    bg: "rgba(192,132,252,0.12)",
    label: "Leave",
  },
  broadcast: {
    icon: "megaphone",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    label: "Broadcast",
  },
  holiday: {
    icon: "flag",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    label: "Holiday",
  },
  checkout_reminder: {
    icon: "time",
    color: "#fb923c",
    bg: "rgba(251,146,60,0.12)",
    label: "Reminder",
  },
  late_login: {
    icon: "alert-circle",
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    label: "Late Login",
  },
  system: {
    icon: "information-circle",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.12)",
    label: "System",
  },
  admin_alert: {
    icon: "shield-checkmark",
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    label: "Alert",
  },
};
