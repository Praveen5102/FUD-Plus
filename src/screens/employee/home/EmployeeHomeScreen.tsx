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
import NotificationBell from "../../../components/notifications/NotificationBell";

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

interface AttendanceRecord {
  id: string;
  check_in: string | null;
  check_out: string | null;
  work_status: string | null;
  total_work_hours: number | null;
  attendance_date: string;
}

interface TimelineDay {
  key: string;
  date: string;
  attendance: AttendanceRecord | null;
  finalStatus: string;
  isGenerated: boolean;
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
    Late: {
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.12)",
      icon: "time",
    },
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
    Weekoff: {
      color: "#94a3b8",
      bg: "rgba(148,163,184,0.12)",
      icon: "calendar-outline",
    },
    Holiday: {
      color: "#38bdf8",
      bg: "rgba(56,189,248,0.12)",
      icon: "gift-outline",
    },
    Leave: {
      color: "#c084fc",
      bg: "rgba(192,132,252,0.12)",
      icon: "airplane-outline",
    },
    Pending: {
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.08)",
      icon: "hourglass-outline",
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

function getMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const today = new Date(year, month, now.getDate());
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return { firstDayStr: fmt(firstDay), todayStr: fmt(today), now };
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function EmployeeHomeScreen() {
  const { user, profile } = useAuth();

  const [loadingInit, setLoadingInit] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null);
  const [monthAttendance, setMonthAttendance] = useState<AttendanceRecord[]>(
    [],
  );
  const [weekoffDays, setWeekoffDays] = useState<string[]>([
    "Saturday",
    "Sunday",
  ]);
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [approvedLeaveDates, setApprovedLeaveDates] = useState<Set<string>>(
    new Set(),
  );
  const [pendingLeaveDates, setPendingLeaveDates] = useState<Set<string>>(
    new Set(),
  );

  // TODO: wire to real unread count from your notifications system
  const unreadNotifCount = 0;

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
          toValue: 1.4,
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
        const { firstDayStr, todayStr } = getMonthRange();
        const currentYear = new Date().getFullYear();

        const [todayRes, monthRes, weekoffRes, holidayRes, leaveRes] =
          await Promise.all([
            supabase
              .from("attendance")
              .select(
                "id, check_in, check_out, work_status, total_work_hours, attendance_date, check_in_selfie, check_out_selfie",
              )
              .eq("employee_id", user.id)
              .eq("attendance_date", todayStr)
              .maybeSingle(),

            supabase
              .from("attendance")
              .select(
                "id, check_in, check_out, work_status, total_work_hours, attendance_date",
              )
              .eq("employee_id", user.id)
              .gte("attendance_date", firstDayStr)
              .lte("attendance_date", todayStr)
              .order("attendance_date", { ascending: false }),

            supabase
              .from("department_weekoffs")
              .select("department, weekoff_days")
              .eq("department", profile?.department ?? ""),

            supabase
              .from("company_holidays")
              .select("holiday_date")
              .eq("is_active", true)
              .gte("holiday_date", `${currentYear}-01-01`)
              .lte("holiday_date", `${currentYear}-12-31`),

            supabase
              .from("leave_requests")
              .select("from_date, to_date, status")
              .eq("employee_id", user.id)
              .in("status", ["Approved", "Pending"])
              .gte("from_date", firstDayStr)
              .lte("to_date", todayStr),
          ]);

        setTodayRecord(todayRes.data ?? null);
        setMonthAttendance(monthRes.data ?? []);

        if (weekoffRes.data && weekoffRes.data.length > 0) {
          setWeekoffDays(weekoffRes.data[0].weekoff_days ?? ["Sunday"]);
        } else {
          setWeekoffDays(["Saturday", "Sunday"]);
        }

        const holSet = new Set<string>(
          (holidayRes.data ?? []).map((h: any) => h.holiday_date),
        );
        setHolidays(holSet);

        const approvedSet = new Set<string>();
        const pendingSet = new Set<string>();
        (leaveRes.data ?? []).forEach((leave: any) => {
          const from = new Date(leave.from_date);
          const to = new Date(leave.to_date);
          for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              "0",
            )}-${String(d.getDate()).padStart(2, "0")}`;
            if (leave.status === "Approved") approvedSet.add(ds);
            else if (leave.status === "Pending") pendingSet.add(ds);
          }
        });
        setApprovedLeaveDates(approvedSet);
        setPendingLeaveDates(pendingSet);
      } catch (e) {
        console.error("[EmployeeHomeScreen] fetchAll:", e);
      } finally {
        fetchingRef.current = false;
        setLoadingInit(false);
        Animated.spring(bannerAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 9,
        }).start();
      }
    },
    [user?.id, profile?.department],
  );

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll();
    if (!user?.id) return;
    const todayStr = new Date().toISOString().split("T")[0];
    realtimeRef.current = supabase
      .channel(`emp-home-${user.id}-${todayStr}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `employee_id=eq.${user.id}`,
        },
        () => fetchAll(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leave_requests",
          filter: `employee_id=eq.${user.id}`,
        },
        () => fetchAll(true),
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

  // ── Derived: day state ────────────────────────────────────────────────────
  const dayState: DayState = useMemo(() => {
    if (!todayRecord?.check_in) return "not_checked_in";
    if (todayRecord.check_in && !todayRecord.check_out) return "checked_in";
    return "completed";
  }, [todayRecord]);

  // ── Timeline: last 7 calendar days ───────────────────────────────────────
  const monthTimeline = useMemo((): TimelineDay[] => {
    const attendanceMap = new Map<string, AttendanceRecord>();
    monthAttendance.forEach((r) => attendanceMap.set(r.attendance_date, r));

    const timeline: TimelineDay[] = [];

    for (let i = 0; i < 7; i++) {
      const cursor = new Date();
      cursor.setDate(cursor.getDate() - i);

      const ds = `${cursor.getFullYear()}-${String(
        cursor.getMonth() + 1,
      ).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const dayName = cursor.toLocaleDateString("en-IN", { weekday: "long" });
      const attendance = attendanceMap.get(ds) ?? null;

      let finalStatus = "Absent";
      if (attendance?.work_status) {
        finalStatus = attendance.work_status;
      } else if (approvedLeaveDates.has(ds)) {
        finalStatus = "Leave";
      } else if (holidays.has(ds)) {
        finalStatus = "Holiday";
      } else if (weekoffDays.includes(dayName)) {
        finalStatus = "Weekoff";
      } else if (pendingLeaveDates.has(ds)) {
        finalStatus = "Pending";
      }

      timeline.push({
        key: ds,
        date: ds,
        attendance,
        finalStatus,
        isGenerated: !attendance,
      });
    }

    return timeline;
  }, [
    monthAttendance,
    weekoffDays,
    holidays,
    approvedLeaveDates,
    pendingLeaveDates,
  ]);

  // ── Monthly summary stats ─────────────────────────────────────────────────
  const monthStats = useMemo(() => {
    let present = 0,
      late = 0,
      halfDay = 0,
      absent = 0,
      weekoffs = 0,
      hols = 0,
      leaves = 0,
      pending = 0,
      overtime = 0;

    const { firstDayStr, todayStr } = getMonthRange();
    const attendanceMap = new Map<string, AttendanceRecord>();
    monthAttendance.forEach((r) => attendanceMap.set(r.attendance_date, r));

    const cursor = new Date(firstDayStr);
    const end = new Date(todayStr);

    while (cursor <= end) {
      const ds = `${cursor.getFullYear()}-${String(
        cursor.getMonth() + 1,
      ).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const dayName = cursor.toLocaleDateString("en-IN", { weekday: "long" });
      const attendance = attendanceMap.get(ds) ?? null;

      let finalStatus = "Absent";
      if (attendance?.work_status) {
        finalStatus = attendance.work_status;
      } else if (approvedLeaveDates.has(ds)) {
        finalStatus = "Leave";
      } else if (holidays.has(ds)) {
        finalStatus = "Holiday";
      } else if (weekoffDays.includes(dayName)) {
        finalStatus = "Weekoff";
      } else if (pendingLeaveDates.has(ds)) {
        finalStatus = "Pending";
      }

      switch (finalStatus) {
        case "Present":
        case "Working":
          present++;
          break;
        case "Late":
          late++;
          break;
        case "Half Day":
          halfDay++;
          break;
        case "Absent":
          absent++;
          break;
        case "Weekoff":
          weekoffs++;
          break;
        case "Holiday":
          hols++;
          break;
        case "Leave":
          leaves++;
          break;
        case "Pending":
          pending++;
          break;
      }
      if (attendance?.total_work_hours && attendance.total_work_hours > 8) {
        overtime += attendance.total_work_hours - 8;
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    const totalDays = Math.max(
      present + late + halfDay + absent + weekoffs + hols + leaves + pending,
      1,
    );
    const workingDays = Math.max(totalDays - weekoffs - hols, 1);
    const attended = present + late + halfDay * 0.5;
    const attendancePercentage = Math.min(
      Math.round((attended / workingDays) * 100),
      100,
    );

    return {
      present,
      late,
      halfDay,
      absent,
      weekoffs,
      holidays: hols,
      leaves,
      pending,
      overtime: Math.round(overtime * 10) / 10,
      workingDays,
      attendancePercentage,
    };
  }, [
    monthAttendance,
    weekoffDays,
    holidays,
    approvedLeaveDates,
    pendingLeaveDates,
  ]);

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
          colors: ["rgba(59,130,246,0.12)", "rgba(59,130,246,0.02)"] as [
            string,
            string,
          ],
          label: "Not Checked In",
          sub: "Tap below to mark attendance",
          icon: "time-outline",
          dotColor: "#fbbf24",
          borderColor: "rgba(59,130,246,0.2)",
        };
      case "checked_in":
        return {
          colors: ["rgba(52,211,153,0.15)", "rgba(52,211,153,0.02)"] as [
            string,
            string,
          ],
          label: "Currently Working",
          sub: `Since ${fmtTime(todayRecord?.check_in ?? null)}`,
          icon: "checkmark-circle",
          dotColor: "#4ade80",
          borderColor: "rgba(52,211,153,0.25)",
        };
      case "completed":
        return {
          colors: ["rgba(167,139,250,0.15)", "rgba(167,139,250,0.02)"] as [
            string,
            string,
          ],
          label: "Attendance Complete",
          sub: `${fmtTime(todayRecord?.check_in ?? null)} → ${fmtTime(
            todayRecord?.check_out ?? null,
          )}`,
          icon: "trophy-outline",
          dotColor: "#a78bfa",
          borderColor: "rgba(167,139,250,0.25)",
        };
    }
  }, [dayState, todayRecord]);

  if (loadingInit) {
    return (
      <LinearGradient
        colors={["#030712", "#0b1528", "#11254c", "#1d4ed8"]}
        style={styles.loaderScreen}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loaderText}>Syncing logs…</Text>
      </LinearGradient>
    );
  }

  return (
    <>
      <LinearGradient
        colors={["#030712", "#0b1528", "#11254c", "#1d4ed8"]}
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
            {/* ── HEADER ────────────────────────────────────────── */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>{greeting} 👋</Text>
                <Text style={styles.name}>
                  {profile?.full_name ?? "Employee"}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Ionicons name="card-outline" size={11} color="#60a5fa" />
                    <Text style={styles.badgeText}>
                      {profile?.employee_id ?? "—"}
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Ionicons
                      name="briefcase-outline"
                      size={11}
                      color="#60a5fa"
                    />
                    <Text style={styles.badgeText}>
                      {profile?.department ?? "—"}
                    </Text>
                  </View>
                </View>
              </View>
              {/* NotificationBell replaces the old inline notifBtn */}
              <NotificationBell unreadCount={unreadNotifCount} />
            </View>

            {/* ── STATUS BANNER ──────────────────────────────────── */}
            <Animated.View
              style={{
                opacity: bannerAnim,
                transform: [
                  {
                    translateY: bannerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [15, 0],
                    }),
                  },
                ],
              }}
            >
              <View
                style={[
                  styles.bannerCard,
                  { borderColor: bannerConfig.borderColor },
                ]}
              >
                <LinearGradient
                  colors={bannerConfig.colors}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.bannerLeft}>
                  <Animated.View
                    style={[
                      styles.bannerDot,
                      {
                        backgroundColor: bannerConfig.dotColor,
                        transform: [
                          {
                            scale: dayState === "checked_in" ? pulseAnim : 1,
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
                                "rgba(255,255,255,0.05)",
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
                  size={28}
                  color="rgba(255,255,255,0.15)"
                />
              </View>
            </Animated.View>

            {/* ── TODAY DETAIL STRIP ─────────────────────────────── */}
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

            {/* ── ATTENDANCE ACTION BUTTON ───────────────────────── */}
            <TouchableOpacity
              activeOpacity={btnConfig.disabled ? 1 : 0.85}
              onPress={() => !btnConfig.disabled && setShowCamera(true)}
              disabled={btnConfig.disabled}
              style={{ marginBottom: 24 }}
            >
              <LinearGradient
                colors={btnConfig.colors}
                style={[
                  styles.attendanceBtn,
                  btnConfig.disabled && { opacity: 0.6 },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name={btnConfig.icon as any} size={20} color="#fff" />
                <Text style={styles.attendanceBtnText}>{btnConfig.label}</Text>
                {dayState === "completed" && (
                  <View style={styles.completedTick}>
                    <Ionicons name="checkmark" size={11} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* ── MONTHLY SUMMARY METRICS ────────────────────────── */}
            <Text style={styles.sectionHeading}>Summary Metrics</Text>
            <View style={styles.card}>
              <View style={styles.monthGrid}>
                {[
                  {
                    value: monthStats.present + monthStats.late,
                    label: "Present",
                    color: "#4ade80",
                  },
                  {
                    value: monthStats.absent,
                    label: "Absent",
                    color: "#f87171",
                  },
                  {
                    value: monthStats.leaves,
                    label: "Leaves",
                    color: "#c084fc",
                  },
                  {
                    value: `${monthStats.attendancePercentage}%`,
                    label: "Rate",
                    color: "#a78bfa",
                  },
                ].map((item) => (
                  <View key={item.label} style={styles.monthCell}>
                    <LinearGradient
                      colors={[item.color + "15", item.color + "02"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={[styles.monthValue, { color: item.color }]}>
                      {item.value}
                    </Text>
                    <Text style={styles.monthLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.monthGrid, { marginTop: 8 }]}>
                {[
                  {
                    value: monthStats.halfDay,
                    label: "Half Day",
                    color: "#fb923c",
                  },
                  {
                    value: monthStats.weekoffs,
                    label: "Weekoffs",
                    color: "#94a3b8",
                  },
                  {
                    value: monthStats.holidays,
                    label: "Holidays",
                    color: "#38bdf8",
                  },
                  {
                    value: monthStats.workingDays,
                    label: "Work Days",
                    color: "#60a5fa",
                  },
                ].map((item) => (
                  <View key={item.label} style={styles.monthCell}>
                    <LinearGradient
                      colors={[item.color + "15", item.color + "02"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={[styles.monthValue, { color: item.color }]}>
                      {item.value}
                    </Text>
                    <Text style={styles.monthLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── ATTENDANCE TIMELINE ────────────────────────────── */}
            {monthTimeline.length > 0 && (
              <>
                <Text style={styles.sectionHeading}>Last 7 Days Timeline</Text>
                <View style={styles.card}>
                  {monthTimeline.map((item, index) => {
                    const statusStr = item.finalStatus;
                    const cfg = STATUS_CFG[statusStr] ?? STATUS_CFG.Absent;
                    const itemDate = new Date(item.date);
                    const isToday =
                      item.date === new Date().toISOString().split("T")[0];

                    return (
                      <View key={item.key}>
                        {index > 0 && <View style={styles.histDivider} />}
                        <View
                          style={[
                            styles.histRow,
                            isToday && styles.histRowToday,
                          ]}
                        >
                          <View
                            style={[
                              styles.histDateBadge,
                              { backgroundColor: cfg.bg },
                            ]}
                          >
                            <Text
                              style={[styles.histDateDay, { color: cfg.color }]}
                            >
                              {itemDate.getDate()}
                            </Text>
                            <Text style={styles.histDateMon}>
                              {itemDate.toLocaleDateString("en-IN", {
                                month: "short",
                              })}
                            </Text>
                          </View>

                          <View style={{ flex: 1, marginLeft: 14 }}>
                            <View style={styles.histTimesRow}>
                              {item.attendance?.check_in ? (
                                <>
                                  <Ionicons
                                    name="log-in-outline"
                                    size={12}
                                    color="#64748b"
                                  />
                                  <Text style={styles.histTime}>
                                    {fmtTime(item.attendance.check_in)}
                                  </Text>
                                  <Feather
                                    name="arrow-right"
                                    size={10}
                                    color="#334155"
                                    style={{ marginHorizontal: 2 }}
                                  />
                                  <Ionicons
                                    name="log-out-outline"
                                    size={12}
                                    color="#64748b"
                                  />
                                  <Text style={styles.histTime}>
                                    {fmtTime(item.attendance.check_out)}
                                  </Text>
                                </>
                              ) : (
                                <Text
                                  style={[
                                    styles.histTime,
                                    {
                                      color: "#475569",
                                      fontStyle: "italic",
                                    },
                                  ]}
                                >
                                  {statusStr === "Weekoff"
                                    ? "Scheduled Weekend Off"
                                    : statusStr === "Holiday"
                                      ? "Public Holiday"
                                      : statusStr === "Leave"
                                        ? "Approved Leave"
                                        : statusStr === "Pending"
                                          ? "Leave Pending Approval"
                                          : "No Activity Recorded"}
                                </Text>
                              )}
                            </View>
                            <Text style={styles.histDateStr}>
                              {itemDate.toLocaleDateString("en-IN", {
                                weekday: "long",
                              })}
                              {isToday ? "  · Today" : ""}
                            </Text>
                          </View>

                          <View style={{ alignItems: "flex-end", gap: 4 }}>
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
                                {statusStr}
                              </Text>
                            </View>
                            {item.attendance?.total_work_hours != null && (
                              <Text style={styles.histHours}>
                                {item.attendance.total_work_hours.toFixed(1)}h
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* ── SELFIE MODAL ──────────────────────────────────────────────── */}
      <SelfieCheckInModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onSuccess={() => fetchAll(true)}
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
    gap: 12,
  },
  loaderText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 130 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  greeting: {
    color: "#3b82f6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  name: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.15)",
  },
  badgeText: { color: "#60a5fa", fontSize: 11, fontWeight: "700" },

  bannerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  bannerDot: { width: 8, height: 8, borderRadius: 4 },
  bannerLabel: { color: "#f1f5f9", fontSize: 16, fontWeight: "800" },
  bannerSub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 1,
    fontWeight: "500",
  },
  bannerStatusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  bannerStatusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  todayStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  todayStripItem: { flex: 1, alignItems: "center", gap: 3 },
  todayStripLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  todayStripValue: { color: "#f1f5f9", fontSize: 13, fontWeight: "800" },
  todayStripDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  attendanceBtn: {
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  attendanceBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  completedTick: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  sectionHeading: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },

  monthGrid: { flexDirection: "row", gap: 6 },
  monthCell: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    gap: 2,
  },
  monthValue: { fontSize: 18, fontWeight: "900" },
  monthLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  histRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  histRowToday: {
    backgroundColor: "rgba(59,130,246,0.06)",
    borderRadius: 14,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    paddingVertical: 10,
  },
  histDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginVertical: 2,
  },
  histDateBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  histDateDay: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  histDateMon: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 1,
  },
  histTimesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  histTime: { color: "#cbd5e1", fontSize: 12, fontWeight: "600" },
  histDateStr: {
    color: "#475569",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  histStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  histStatusText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  histHours: { color: "#475569", fontSize: 10, fontWeight: "700" },
});
