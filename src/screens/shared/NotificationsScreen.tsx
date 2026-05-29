// screens/NotificationsScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import GradientScreen from "../../components/layout/GradientScreen";
import NotificationCard from "../../components/notifications/NotificationCard";
import { useNotifications } from "../../hooks/useNotifications";
import {
  Notification,
  NotificationType,
} from "../../services/notificationService";

// ─── FILTER TABS ──────────────────────────────────────────────────────────────
type FilterTab = "all" | NotificationType;

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "attendance", label: "Attendance" },
  { key: "leave", label: "Leave" },
  { key: "broadcast", label: "Broadcast" },
  { key: "checkout_reminder", label: "Reminders" },
  { key: "admin_alert", label: "Alerts" },
];

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
const EmptyState = React.memo(({ activeTab }: { activeTab: FilterTab }) => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIconRing}>
      <Ionicons name="notifications-off-outline" size={34} color="#1e3a5f" />
    </View>
    <Text style={styles.emptyTitle}>All caught up</Text>
    <Text style={styles.emptySub}>
      {activeTab === "all"
        ? "No notifications yet"
        : `No ${activeTab} notifications`}
    </Text>
  </View>
));

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const navigation = useNavigation();
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    hasMore,
    onRefresh,
    loadMore,
    markRead,
    markAllRead,
    filterByType,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filteredNotifications = useMemo(
    () => filterByType(activeTab === "all" ? "all" : activeTab),
    [activeTab, filterByType],
  );

  const handleNotifPress = useCallback(
    async (notif: Notification) => {
      if (!notif.is_read) await markRead(notif.id);
    },
    [markRead],
  );

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationCard notification={item} onPress={handleNotifPress} />
    ),
    [handleNotifPress],
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const ListFooter = useCallback(() => {
    if (!hasMore)
      return (
        <View style={styles.endRow}>
          <View style={styles.endLine} />
          <Text style={styles.endText}>You're all caught up</Text>
          <View style={styles.endLine} />
        </View>
      );
    return (
      <View style={styles.loaderMore}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }, [hasMore]);

  return (
    <GradientScreen>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* ── HEADER ────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerEyebrow}>ALERTS & UPDATES</Text>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={markAllRead}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["rgba(37,99,235,0.25)", "rgba(37,99,235,0.1)"]}
                style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
              />
              <Feather name="check-circle" size={13} color="#60a5fa" />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── UNREAD SUMMARY STRIP ──────────────────────────────────── */}
        {unreadCount > 0 && (
          <View style={styles.unreadStrip}>
            <LinearGradient
              colors={["rgba(37,99,235,0.2)", "rgba(37,99,235,0.06)"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <View style={styles.unreadDotLive} />
            <Text style={styles.unreadStripText}>
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {/* ── FILTER TABS ───────────────────────────────────────────── */}
        <View style={styles.tabsWrap}>
          <FlatList
            data={TABS}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
            keyExtractor={(t) => t.key}
            renderItem={({ item: tab }) => {
              const isActive = activeTab === tab.key;
              const tabCount =
                tab.key === "all"
                  ? notifications.length
                  : notifications.filter((n) => n.type === tab.key).length;
              return (
                <TouchableOpacity
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  {isActive && (
                    <LinearGradient
                      colors={["#1d4ed8", "#3b82f6"]}
                      style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  )}
                  <Text
                    style={[styles.tabText, isActive && styles.tabTextActive]}
                  >
                    {tab.label}
                  </Text>
                  {tabCount > 0 && (
                    <View
                      style={[
                        styles.tabCount,
                        isActive && styles.tabCountActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabCountText,
                          isActive && { color: "#fff" },
                        ]}
                      >
                        {tabCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* ── NOTIFICATION LIST ─────────────────────────────────────── */}
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loaderText}>Loading notifications…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              filteredNotifications.length > 0 ? ListFooter : null
            }
            ListEmptyComponent={<EmptyState activeTab={activeTab} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#60a5fa"
              />
            }
          />
        )}
      </SafeAreaView>
    </GradientScreen>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerEyebrow: {
    color: "#1d4ed8",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 2.2,
  },
  headerTitle: {
    color: "#f1f5f9",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
  },
  markAllText: { color: "#60a5fa", fontSize: 11, fontWeight: "700" },

  unreadStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 18,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
  },
  unreadDotLive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  unreadStripText: { color: "#60a5fa", fontSize: 12, fontWeight: "700" },

  tabsWrap: { marginBottom: 12 },
  tabsContent: { paddingHorizontal: 18, gap: 8, alignItems: "center" },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  tabActive: {},
  tabText: { color: "#475569", fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
  tabCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tabCountActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  tabCountText: { color: "#64748b", fontSize: 9, fontWeight: "800" },

  listContent: { paddingHorizontal: 18, paddingBottom: 120 },

  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loaderText: { color: "#475569", fontSize: 13 },
  loaderMore: { paddingVertical: 20, alignItems: "center" },

  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyIconRing: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: "rgba(37,99,235,0.08)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: { color: "#94a3b8", fontSize: 16, fontWeight: "700" },
  emptySub: { color: "#334155", fontSize: 12 },

  endRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  endLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.05)" },
  endText: { color: "#334155", fontSize: 10, fontWeight: "600" },
});
