// hooks/useNotifications.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as ExpoNotifications from "expo-notifications";
import { supabase } from "../services/supabase";
import {
  Notification,
  NotificationType,
  markNotificationRead,
  markAllNotificationsRead,
  registerForPushNotifications,
  cancelCheckoutReminder,
} from "../services/notificationService";
import { useAuth } from "../context/AuthContext";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  filterByType: (type: NotificationType | "all") => Notification[];
}

const PAGE_SIZE = 20;

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fetchingRef = useRef(false);

  // ── Fetch paginated ────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(
    async (reset = false) => {
      if (!user?.id || fetchingRef.current) return;
      fetchingRef.current = true;

      const currentPage = reset ? 0 : page;
      if (reset) setLoading(true);

      try {
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("notifications")
          .select(
            "id, user_id, title, message, type, reference_id, is_read, created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        const rows = (data ?? []) as Notification[];

        if (reset) {
          setNotifications(rows);
          setPage(1);
        } else {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            return [...prev, ...rows.filter((r) => !existingIds.has(r.id))];
          });
          setPage((p) => p + 1);
        }

        setHasMore(rows.length === PAGE_SIZE);
      } catch (err) {
        console.error("[useNotifications] fetch error:", err);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [user?.id, page],
  );

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications(true);

    // Register push token
    registerForPushNotifications(user.id).catch(console.error);

    // Supabase realtime — INSERT new notifications instantly
    realtimeRef.current = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => {
            if (prev.find((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n)),
          );
        },
      )
      .subscribe();

    return () => {
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    };
  }, [user?.id]);

  // ── Re-fetch when app comes to foreground ─────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") fetchNotifications(true);
    });
    return () => sub.remove();
  }, [fetchNotifications]);

  // ── Listen for notification tap (foreground + background) ─────────────────
  useEffect(() => {
    const foreground = ExpoNotifications.addNotificationReceivedListener(
      (notif) => {
        console.log(
          "[Notifications] Foreground notification received:",
          notif.request.content.title,
        );
        // Badge update
        ExpoNotifications.getBadgeCountAsync().then((count) =>
          ExpoNotifications.setBadgeCountAsync(count + 1),
        );
      },
    );

    const response = ExpoNotifications.addNotificationResponseReceivedListener(
      (_response) => {
        // User tapped notification — refresh
        fetchNotifications(true);
      },
    );

    return () => {
      foreground.remove();
      response.remove();
    };
  }, [fetchNotifications]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(true);
    setRefreshing(false);
  }, [fetchNotifications]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchNotifications(false);
  }, [hasMore, loading, fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    await markNotificationRead(id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsRead(user.id);
    await ExpoNotifications.setBadgeCountAsync(0);
  }, [user?.id]);

  const filterByType = useCallback(
    (type: NotificationType | "all") =>
      type === "all"
        ? notifications
        : notifications.filter((n) => n.type === type),
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    hasMore,
    fetchNotifications,
    onRefresh,
    loadMore,
    markRead,
    markAllRead,
    filterByType,
  };
}
