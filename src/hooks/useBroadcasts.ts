import { useState, useEffect, useCallback, useRef } from "react";
import { broadcastService } from "../services/broadcast";
import { Broadcast } from "../types/broadcast";

export const useBroadcasts = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    try {
      const data = await broadcastService.getBroadcasts();
      setBroadcasts(data);
      setUnreadCount(data.filter((b) => !b.read_by_user).length);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await broadcastService.markAsRead(id);
    setBroadcasts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, read_by_user: true } : b)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    // Clean up previous subscription before creating a new one
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    fetchBroadcasts();
    const unsubscribe = broadcastService.subscribe(() => fetchBroadcasts());
    unsubscribeRef.current = unsubscribe;
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [fetchBroadcasts]);

  return {
    broadcasts,
    loading,
    refreshing,
    unreadCount,
    fetchBroadcasts,
    markAsRead,
  };
};

export const useUnreadBroadcastsCount = () => {
  const { unreadCount } = useBroadcasts();
  return unreadCount;
};
