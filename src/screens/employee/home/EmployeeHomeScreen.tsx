import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../../services/supabase";
import { useAuth } from "../../../context/AuthContext";
import SelfieCheckInModal from "../../../components/modals/SelfieCheckInModal";

const { width } = Dimensions.get("window");

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface TodayAttendance {
  id: string;
  check_in: string | null;
  check_out: string | null;
  work_status: string | null;
  total_work_hours: number | null;
  attendance_date: string;
  check_in_selfie: string | null;
  check_out_selfie: string | null;
}

interface HistoryRecord {
  id: string;
  check_in: string | null;
  check_out: string | null;
  work_status: string | null;
  total_work_hours: number | null;
  attendance_date: string;
}

type DayState = "not_checked_in" | "checked_in" | "completed";

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; icon: string }> =
  {
    Present: {
      color: "#4ade80",
      bg: "rgba(74,222,128,0.12)",
      icon: "checkmark-circle",
    },
    Late: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", icon: "time" },
    "Half Day": {
      color: "#fb923c",
      bg: "rgba(251,146,60,0.12)",
      icon: "remove-circle",
    },
    Absent: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.12)",
      icon: "close-circle",
    },
    Working: {
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.12)",
      icon: "ellipsis-horizontal-circle",
    },
  };

function fmtTime(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function EmployeeHomeScreen() {
  const { user } = useAuth();

  const [loadingInit, setLoadingInit] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fetchingRef = useRef(false);

  // Animations
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 17
        ? "Good Afternoon"
        : "Good Evening";

  // ── Pulse for live indicator ──────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(
    async (silent = false) => {
      if (!user?.id || fetchingRef.current) return;
      fetchingRef.current = true;
      if (!silent) setLoadingInit(true);

      try {
        const today = new Date().toISOString().split("T")[0];

        const [profileRes, todayRes, historyRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, employee_id, department, profile_image")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("attendance")
            .select(
              "id, check_in, check_out, work_status, total_work_hours, attendance_date, check_in_selfie, check_out_selfie",
            )
            .eq("employee_id", user.id)
            .eq("attendance_date", today)
            .maybeSingle(),
          supabase
            .from("attendance")
            .select(
              "id, check_in, check_out, work_status, total_work_hours, attendance_date",
            )
            .eq("employee_id", user.id)
            .order("attendance_date", { ascending: false })
            .limit(14),
        ]);

        if (profileRes.data) setProfile(profileRes.data);
        setTodayRecord(todayRes.data ?? null);
        setHistory(historyRes.data ?? []);
      } catch (e) {
        console.error("fetchAll:", e);
      } finally {
        fetchingRef.current = false;
        setLoadingInit(false);
        // Animate banner
        Animated.spring(bannerAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 9,
        }).start();
      }
    },
    [user?.id],
  );

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll();

    if (!user?.id) return;
    const today = new Date().toISOString().split("T")[0];
    realtimeRef.current = supabase
      .channel(`emp-attendance-${user.id}-${today}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `employee_id=eq.${user.id}`,
        },
        () => {
          fetchAll(true);
        },
      )
      .subscribe();

    return () => {
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    };
  }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const dayState: DayState = useMemo(() => {
    if (!todayRecord || !todayRecord.check_in) return "not_checked_in";
    if (todayRecord.check_in && !todayRecord.check_out) return "checked_in";
    return "completed";
  }, [todayRecord]);

  const monthStats = useMemo(() => {
    const present = history.filter((r) => r.work_status === "Present").length;
    const late = history.filter((r) => r.work_status === "Late").length;
    const halfDay = history.filter((r) => r.work_status === "Half Day").length;
    const overtime = history.reduce((sum, r) => {
      if (r.total_work_hours && r.total_work_hours > 8)
        return sum + (r.total_work_hours - 8);
      return sum;
    }, 0);
    return { present, late, halfDay, overtime };
  }, [history]);

  // ── Attendance button config ──────────────────────────────────────────────
  const btnConfig = useMemo(() => {
    switch (dayState) {
      case "not_checked_in":
        return {
          colors: ["#1d4ed8", "#3b82f6"] as [string, string],
          icon: "camera-outline",
          label: "Capture Check-In Selfie",
          disabled: false,
        };
      case "checked_in":
        return {
          colors: ["#991b1b", "#dc2626"] as [string, string],
          icon: "log-out-outline",
          label: "Capture Check-Out Selfie",
          disabled: false,
        };
      case "completed":
        return {
          colors: ["#14532d", "#166534"] as [string, string],
          icon: "checkmark-circle-outline",
          label: "Attendance Completed",
          disabled: true,
        };
    }
  }, [dayState]);

  // ── Banner config ─────────────────────────────────────────────────────────
  const bannerConfig = useMemo(() => {
    switch (dayState) {
      case "not_checked_in":
        return {
          colors: ["#1e3a5f", "#1d4ed8"] as [string, string],
          label: "Not Checked In",
          sub: "Tap below to mark attendance",
          icon: "time-outline",
          dotColor: "#fbbf24",
        };
      case "checked_in":
        return {
          colors: ["#14532d", "#166534"] as [string, string],
          label: "Currently Working",
          sub: `Since ${fmtTime(todayRecord?.check_in ?? null)}`,
          icon: "checkmark-circle",
          dotColor: "#4ade80",
        };
      case "completed":
        return {
          colors: ["#1e1b4b", "#3730a3"] as [string, string],
          label: "Attendance Complete",
          sub: `${fmtTime(todayRecord?.check_in ?? null)} → ${fmtTime(todayRecord?.check_out ?? null)}`,
          icon: "trophy",
          dotColor: "#a78bfa",
        };
    }
  }, [dayState, todayRecord]);

  // ─────────────────────────────────────────────────────────────────────────
  if (loadingInit) {
    return (
      <LinearGradient
        colors={["#060d1f", "#0b1533", "#0f1e42"]}
        style={styles.loaderScreen}
      >
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loaderText}>Loading…</Text>
      </LinearGradient>
    );
  }

  return (
    <>
      <LinearGradient
        colors={["#060d1f", "#0b1533", "#0f1e42"]}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#60a5fa"
              />
            }
          >
            {/* ── HEADER ──────────────────────────────────────────── */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>{greeting} 👋</Text>
                <Text style={styles.name}>{profile?.full_name ?? "—"}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Ionicons name="card-outline" size={10} color="#93c5fd" />
                    <Text style={styles.badgeText}>
                      {profile?.employee_id ?? "—"}
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Ionicons
                      name="briefcase-outline"
                      size={10}
                      color="#93c5fd"
                    />
                    <Text style={styles.badgeText}>
                      {profile?.department ?? "—"}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.notifBtn}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                <View style={styles.notifDot} />
              </TouchableOpacity>
            </View>

            {/* ── STATUS BANNER ───────────────────────────────────── */}
            <Animated.View
              style={{
                opacity: bannerAnim,
                transform: [
                  {
                    translateY: bannerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <LinearGradient
                colors={bannerConfig.colors}
                style={styles.banner}
              >
                <View style={styles.bannerLeft}>
                  <Animated.View
                    style={[
                      styles.bannerDot,
                      {
                        backgroundColor: bannerConfig.dotColor,
                        transform: [
                          {
                            scale:
                              dayState === "checked_in"
                                ? pulseAnim
                                : new Animated.Value(1),
                          },
                        ],
                      },
                    ]}
                  />
                  <View>
                    <Text style={styles.bannerLabel}>{bannerConfig.label}</Text>
                    <Text style={styles.bannerSub}>{bannerConfig.sub}</Text>
                    {dayState !== "not_checked_in" &&
                      todayRecord?.work_status && (
                        <View
                          style={[
                            styles.bannerStatusPill,
                            {
                              backgroundColor:
                                STATUS_CFG[todayRecord.work_status]?.bg ??
                                "rgba(255,255,255,0.1)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.bannerStatusText,
                              {
                                color:
                                  STATUS_CFG[todayRecord.work_status]?.color ??
                                  "#fff",
                              },
                            ]}
                          >
                            {todayRecord.work_status}
                          </Text>
                        </View>
                      )}
                  </View>
                </View>
                <Ionicons
                  name={bannerConfig.icon as any}
                  size={32}
                  color="rgba(255,255,255,0.6)"
                />
              </LinearGradient>
            </Animated.View>

            {/* ── TODAY DETAIL STRIP (when checked in or completed) ── */}
            {dayState !== "not_checked_in" && todayRecord && (
              <View style={styles.todayStrip}>
                <View style={styles.todayStripItem}>
                  <Ionicons name="log-in-outline" size={14} color="#4ade80" />
                  <Text style={styles.todayStripLabel}>Check-In</Text>
                  <Text style={styles.todayStripValue}>
                    {fmtTime(todayRecord.check_in)}
                  </Text>
                </View>
                <View style={styles.todayStripDivider} />
                <View style={styles.todayStripItem}>
                  <Ionicons name="log-out-outline" size={14} color="#f87171" />
                  <Text style={styles.todayStripLabel}>Check-Out</Text>
                  <Text style={styles.todayStripValue}>
                    {fmtTime(todayRecord.check_out)}
                  </Text>
                </View>
                <View style={styles.todayStripDivider} />
                <View style={styles.todayStripItem}>
                  <Ionicons name="time-outline" size={14} color="#a78bfa" />
                  <Text style={styles.todayStripLabel}>Hours</Text>
                  <Text style={styles.todayStripValue}>
                    {todayRecord.total_work_hours != null
                      ? `${todayRecord.total_work_hours.toFixed(1)}h`
                      : dayState === "checked_in"
                        ? "Live"
                        : "—"}
                  </Text>
                </View>
              </View>
            )}

            {/* ── ATTENDANCE BUTTON ────────────────────────────────── */}
            <TouchableOpacity
              activeOpacity={btnConfig.disabled ? 1 : 0.88}
              onPress={() => !btnConfig.disabled && setShowCamera(true)}
              disabled={btnConfig.disabled}
              style={{ marginBottom: 18 }}
            >
              <LinearGradient
                colors={btnConfig.colors}
                style={[
                  styles.attendanceBtn,
                  btnConfig.disabled && { opacity: 0.75 },
                ]}
              >
                <Ionicons name={btnConfig.icon as any} size={22} color="#fff" />
                <Text style={styles.attendanceBtnText}>{btnConfig.label}</Text>
                {dayState === "completed" && (
                  <View style={styles.completedTick}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* ── MONTHLY STATS ─────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>THIS MONTH</Text>
              <Text style={styles.cardTitle}>Summary</Text>
              <View style={styles.monthGrid}>
                {[
                  {
                    value: monthStats.present,
                    label: "Present",
                    color: "#4ade80",
                  },
                  { value: monthStats.late, label: "Late", color: "#fbbf24" },
                  {
                    value: monthStats.halfDay,
                    label: "Half Day",
                    color: "#fb923c",
                  },
                  {
                    value: `${monthStats.overtime.toFixed(1)}h`,
                    label: "Overtime",
                    color: "#a78bfa",
                  },
                ].map((item) => (
                  <View key={item.label} style={styles.monthCell}>
                    <LinearGradient
                      colors={[item.color + "20", item.color + "06"]}
                      style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                    />
                    <Text style={[styles.monthValue, { color: item.color }]}>
                      {item.value}
                    </Text>
                    <Text style={styles.monthLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── ATTENDANCE HISTORY ────────────────────────────────── */}
            {history.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardEyebrow}>RECENT</Text>
                <Text style={[styles.cardTitle, { marginBottom: 16 }]}>
                  Attendance Log
                </Text>
                {history.slice(0, 10).map((item, index) => {
                  const cfg =
                    STATUS_CFG[item.work_status ?? ""] ?? STATUS_CFG.Working;
                  return (
                    <View key={item.id}>
                      {index > 0 && <View style={styles.histDivider} />}
                      <View style={styles.histRow}>
                        {/* Date badge */}
                        <View style={styles.histDateBadge}>
                          <Text style={styles.histDateDay}>
                            {new Date(item.attendance_date).getDate()}
                          </Text>
                          <Text style={styles.histDateMon}>
                            {new Date(item.attendance_date).toLocaleDateString(
                              "en-IN",
                              { month: "short" },
                            )}
                          </Text>
                        </View>

                        {/* Times */}
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <View style={styles.histTimesRow}>
                            <Ionicons
                              name="log-in-outline"
                              size={11}
                              color="#475569"
                            />
                            <Text style={styles.histTime}>
                              {fmtTime(item.check_in)}
                            </Text>
                            <Feather
                              name="arrow-right"
                              size={10}
                              color="#334155"
                            />
                            <Ionicons
                              name="log-out-outline"
                              size={11}
                              color="#475569"
                            />
                            <Text style={styles.histTime}>
                              {fmtTime(item.check_out)}
                            </Text>
                          </View>
                          <Text style={styles.histDateStr}>
                            {new Date(item.attendance_date).toLocaleDateString(
                              "en-IN",
                              { weekday: "long" },
                            )}
                          </Text>
                        </View>

                        {/* Right */}
                        <View style={{ alignItems: "flex-end", gap: 5 }}>
                          <View
                            style={[
                              styles.histStatusBadge,
                              { backgroundColor: cfg.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.histStatusText,
                                { color: cfg.color },
                              ]}
                            >
                              {item.work_status ?? "—"}
                            </Text>
                          </View>
                          {item.total_work_hours != null && (
                            <Text style={styles.histHours}>
                              {item.total_work_hours.toFixed(1)}h
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* ── SELFIE MODAL ─────────────────────────────────────────────── */}
      <SelfieCheckInModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onSuccess={() => {
          fetchAll(true);
        }}
      />
    </>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loaderText: { color: "#60a5fa", fontSize: 14 },
  scroll: { padding: 20, paddingBottom: 130 },

  // Header
  header: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  greeting: { color: "#60a5fa", fontSize: 13, fontWeight: "600" },
  name: {
    color: "#f1f5f9",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.3,
  },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(96,165,250,0.1)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.2)",
  },
  badgeText: { color: "#93c5fd", fontSize: 11, fontWeight: "600" },
  notifBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  notifDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    position: "absolute",
    top: 9,
    right: 9,
  },

  // Banner
  banner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  bannerDot: { width: 10, height: 10, borderRadius: 5 },
  bannerLabel: { color: "#f1f5f9", fontSize: 17, fontWeight: "800" },
  bannerSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  bannerStatusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  bannerStatusText: { fontSize: 11, fontWeight: "800" },

  // Today strip
  todayStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  todayStripItem: { flex: 1, alignItems: "center", gap: 4 },
  todayStripLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  todayStripValue: { color: "#f1f5f9", fontSize: 14, fontWeight: "900" },
  todayStripDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.07)" },

  // Attendance button
  attendanceBtn: {
    height: 60,
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  attendanceBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  completedTick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Card
  card: {
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  cardEyebrow: {
    color: "#1d4ed8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 2,
  },
  cardTitle: { color: "#f1f5f9", fontSize: 16, fontWeight: "800" },

  // Monthly grid
  monthGrid: { flexDirection: "row", gap: 8, marginTop: 14 },
  monthCell: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 4,
  },
  monthValue: { fontSize: 20, fontWeight: "900" },
  monthLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // History
  histRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  histDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)" },
  histDateBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.12)",
    justifyContent: "center",
    alignItems: "center",
    gap: 0,
  },
  histDateDay: {
    color: "#60a5fa",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
  },
  histDateMon: {
    color: "#334155",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  histTimesRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  histTime: { color: "#94a3b8", fontSize: 12, fontWeight: "500" },
  histDateStr: { color: "#334155", fontSize: 10, marginTop: 3 },
  histStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  histStatusText: { fontSize: 10, fontWeight: "800" },
  histHours: { color: "#475569", fontSize: 10, fontWeight: "600" },
});
