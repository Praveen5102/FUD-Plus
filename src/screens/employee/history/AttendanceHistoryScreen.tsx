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
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../services/supabase";
import { useAuth } from "../../../context/AuthContext";

const { width, height } = Dimensions.get("window");

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  id: string;
  check_in: string | null;
  check_out: string | null;
  total_work_hours: number | null;
  work_status: string | null;
  attendance_date: string;
}

interface TimelineDay {
  date: string;
  weekday: string;
  attendance: AttendanceRecord | null;
  finalStatus: string;
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<
  string,
  { color: string; bg: string; border: string; icon: string }
> = {
  Present: {
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.25)",
    icon: "checkmark-circle",
  },
  Late: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.25)",
    icon: "time",
  },
  "Half Day": {
    color: "#fb923c",
    bg: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.25)",
    icon: "remove-circle",
  },
  Absent: {
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.25)",
    icon: "close-circle",
  },
  Working: {
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.25)",
    icon: "ellipsis-horizontal-circle",
  },
  Weekoff: {
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.25)",
    icon: "cafe-outline",
  },
  Holiday: {
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.25)",
    icon: "gift-outline",
  },
  Leave: {
    color: "#c084fc",
    bg: "rgba(192,132,252,0.12)",
    border: "rgba(192,132,252,0.25)",
    icon: "airplane-outline",
  },
  Pending: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.2)",
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

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// ─── CALENDAR BOTTOM SHEET ────────────────────────────────────────────────────
function CalendarSheet({
  visible,
  markedDates,
  selectedDate,
  onSelectDate,
  onClose,
}: {
  visible: boolean;
  markedDates: any;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : height,
      useNativeDriver: true,
      tension: 65,
      friction: 12,
    }).start();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={sheetStyles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
        <Animated.View
          style={[
            sheetStyles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={["#0c1628", "#0f1b2e"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
          />

          {/* Handle */}
          <View style={sheetStyles.handle} />

          {/* Header */}
          <View style={sheetStyles.sheetHeader}>
            <View>
              <Text style={sheetStyles.sheetTitle}>Pick a Date</Text>
              <Text style={sheetStyles.sheetSub}>
                Tap any date to view attendance
              </Text>
            </View>
            <TouchableOpacity style={sheetStyles.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Legend row */}
          <View style={sheetStyles.legendRow}>
            {[
              { label: "Present", color: "#4ade80" },
              { label: "Absent", color: "#f87171" },
              { label: "Leave", color: "#c084fc" },
              { label: "Weekoff", color: "#94a3b8" },
            ].map((l) => (
              <View key={l.label} style={sheetStyles.legendItem}>
                <View
                  style={[sheetStyles.legendDot, { backgroundColor: l.color }]}
                />
                <Text style={sheetStyles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>

          {/* Calendar */}
          <Calendar
            markedDates={markedDates}
            onDayPress={(day: { dateString: string }) => {
              onSelectDate(day.dateString);
              onClose();
            }}
            markingType="dot"
            theme={{
              backgroundColor: "transparent",
              calendarBackground: "transparent",
              dayTextColor: "#cbd5e1",
              monthTextColor: "#f1f5f9",
              arrowColor: "#3b82f6",
              todayTextColor: "#3b82f6",
              textDisabledColor: "#1e293b",
              selectedDayBackgroundColor: "#1d4ed8",
              selectedDayTextColor: "#fff",
              dotColor: "#3b82f6",
              textDayFontWeight: "600",
              textMonthFontWeight: "900",
              textDayHeaderFontWeight: "700",
              textDayHeaderFontSize: 11,
            }}
          />

          {/* Done button */}
          <TouchableOpacity
            style={sheetStyles.doneBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#1d4ed8", "#3b82f6"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <Text style={sheetStyles.doneBtnText}>Close Calendar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── SELECTED DAY DETAIL CARD ─────────────────────────────────────────────────
function SelectedDayCard({ day }: { day: TimelineDay }) {
  const cfg = STATUS_CFG[day.finalStatus] ?? STATUS_CFG.Absent;
  const date = new Date(day.date);
  const isToday = day.date === toDateStr(new Date());

  return (
    <View style={detailStyles.card}>
      <LinearGradient
        colors={[cfg.bg, "transparent"]}
        style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
      />
      <View style={[detailStyles.cardBorder, { borderColor: cfg.border }]} />

      {/* Top row */}
      <View style={detailStyles.topRow}>
        <View>
          <Text style={detailStyles.dayLabel}>
            {isToday ? "Today" : day.weekday}
          </Text>
          <Text style={detailStyles.dateText}>
            {date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>
        <View
          style={[
            detailStyles.statusPill,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
          <Text style={[detailStyles.statusText, { color: cfg.color }]}>
            {day.finalStatus}
          </Text>
        </View>
      </View>

      {/* Time row */}
      {day.attendance ? (
        <View style={detailStyles.timeGrid}>
          <View style={detailStyles.timeItem}>
            <Ionicons name="log-in-outline" size={16} color="#4ade80" />
            <Text style={detailStyles.timeLabel}>Check-In</Text>
            <Text style={[detailStyles.timeValue, { color: "#4ade80" }]}>
              {fmtTime(day.attendance.check_in)}
            </Text>
          </View>
          <View style={detailStyles.timeDivider} />
          <View style={detailStyles.timeItem}>
            <Ionicons name="log-out-outline" size={16} color="#f87171" />
            <Text style={detailStyles.timeLabel}>Check-Out</Text>
            <Text style={[detailStyles.timeValue, { color: "#f87171" }]}>
              {fmtTime(day.attendance.check_out)}
            </Text>
          </View>
          <View style={detailStyles.timeDivider} />
          <View style={detailStyles.timeItem}>
            <Ionicons name="time-outline" size={16} color="#a78bfa" />
            <Text style={detailStyles.timeLabel}>Hours</Text>
            <Text style={[detailStyles.timeValue, { color: "#a78bfa" }]}>
              {day.attendance.total_work_hours != null
                ? `${day.attendance.total_work_hours.toFixed(1)}h`
                : "—"}
            </Text>
          </View>
        </View>
      ) : (
        <View style={detailStyles.noDataRow}>
          <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
          <Text style={[detailStyles.noDataText, { color: cfg.color }]}>
            {day.finalStatus === "Weekoff"
              ? "Scheduled Weekend Off — No Attendance Required"
              : day.finalStatus === "Holiday"
                ? "Public Holiday — Office Closed"
                : day.finalStatus === "Leave"
                  ? "Approved Leave — No Attendance Required"
                  : day.finalStatus === "Pending"
                    ? "Leave Request Pending Approval"
                    : "No Check-In Activity Recorded"}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function AttendanceHistoryScreen() {
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
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
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const fromStr = toDateStr(thirtyDaysAgo);
      const toStr = toDateStr(today);
      const currentYear = today.getFullYear();

      const [attnRes, weekoffRes, holRes, leaveRes] = await Promise.all([
        supabase
          .from("attendance")
          .select(
            "id, check_in, check_out, total_work_hours, work_status, attendance_date",
          )
          .eq("employee_id", user.id)
          .gte("attendance_date", fromStr)
          .lte("attendance_date", toStr)
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
          .gte("from_date", fromStr)
          .lte("to_date", toStr),
      ]);

      setAttendanceData(attnRes.data ?? []);

      if (weekoffRes.data && weekoffRes.data.length > 0) {
        setWeekoffDays(weekoffRes.data[0].weekoff_days ?? ["Sunday"]);
      } else {
        setWeekoffDays(["Saturday", "Sunday"]);
      }

      const holSet = new Set<string>(
        (holRes.data ?? []).map((h: any) => h.holiday_date),
      );
      setHolidays(holSet);

      const approvedSet = new Set<string>();
      const pendingSet = new Set<string>();
      (leaveRes.data ?? []).forEach((leave: any) => {
        const from = new Date(leave.from_date);
        const to = new Date(leave.to_date);
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const ds = toDateStr(new Date(d));
          if (leave.status === "Approved") approvedSet.add(ds);
          else if (leave.status === "Pending") pendingSet.add(ds);
        }
      });
      setApprovedLeaveDates(approvedSet);
      setPendingLeaveDates(pendingSet);
    } catch (e) {
      console.error("[AttendanceHistoryScreen] fetch:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.department]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  // ── Timeline: last 30 days ────────────────────────────────────────────────
  const timelineData = useMemo((): TimelineDay[] => {
    const today = new Date();
    const attendanceMap = new Map<string, AttendanceRecord>();
    attendanceData.forEach((r) => attendanceMap.set(r.attendance_date, r));

    const result: TimelineDay[] = [];

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const ds = toDateStr(d);
      const weekday = d.toLocaleDateString("en-IN", { weekday: "long" });
      const attendance = attendanceMap.get(ds) ?? null;

      let finalStatus = "Absent";
      if (attendance?.work_status) {
        finalStatus = attendance.work_status;
      } else if (approvedLeaveDates.has(ds)) {
        finalStatus = "Leave";
      } else if (holidays.has(ds)) {
        finalStatus = "Holiday";
      } else if (weekoffDays.includes(weekday)) {
        finalStatus = "Weekoff";
      } else if (pendingLeaveDates.has(ds)) {
        finalStatus = "Pending";
      }

      result.push({ date: ds, weekday, attendance, finalStatus });
    }

    return result;
  }, [
    attendanceData,
    weekoffDays,
    holidays,
    approvedLeaveDates,
    pendingLeaveDates,
  ]);

  // ── Summary ───────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let present = 0,
      absent = 0,
      late = 0,
      halfDay = 0,
      weekoffs = 0,
      hols = 0,
      leaves = 0,
      pending = 0;

    timelineData.forEach((d) => {
      switch (d.finalStatus) {
        case "Present":
        case "Working":
          present++;
          break;
        case "Absent":
          absent++;
          break;
        case "Late":
          late++;
          break;
        case "Half Day":
          halfDay++;
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
    });

    const workingDays = Math.max(30 - weekoffs - hols, 1);
    const attended = present + late + halfDay * 0.5;
    const attendancePercentage = Math.min(
      Math.round((attended / workingDays) * 100),
      100,
    );

    return {
      present,
      absent,
      late,
      halfDay,
      weekoffs,
      holidays: hols,
      leaves,
      pending,
      workingDays,
      attendancePercentage,
    };
  }, [timelineData]);

  // ── Calendar marked dates ─────────────────────────────────────────────────
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    timelineData.forEach((item) => {
      const cfg = STATUS_CFG[item.finalStatus] ?? STATUS_CFG.Absent;
      marks[item.date] = {
        marked: true,
        dotColor: cfg.color,
        selected: item.date === selectedDate,
        selectedColor:
          item.date === selectedDate ? cfg.color + "40" : undefined,
      };
    });
    return marks;
  }, [timelineData, selectedDate]);

  // ── Selected day data ─────────────────────────────────────────────────────
  const selectedDay = useMemo(
    () =>
      timelineData.find((d) => d.date === selectedDate) ?? {
        date: selectedDate,
        weekday: new Date(selectedDate).toLocaleDateString("en-IN", {
          weekday: "long",
        }),
        attendance: null,
        finalStatus: "Absent",
      },
    [timelineData, selectedDate],
  );

  if (loading) {
    return (
      <LinearGradient
        colors={["#071226", "#0f1f3d", "#163a72", "#1d4ed8"]}
        style={styles.loader}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loaderText}>Loading history…</Text>
      </LinearGradient>
    );
  }

  return (
    <>
      <LinearGradient
        colors={["#071226", "#0f1f3d", "#163a72", "#1d4ed8"]}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
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
              <View>
                <Text style={styles.eyebrow}>ATTENDANCE</Text>
                <Text style={styles.title}>History</Text>
              </View>
              {/* Calendar icon button */}
              <TouchableOpacity
                style={styles.calIconBtn}
                onPress={() => setShowCalendar(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["rgba(37,99,235,0.4)", "rgba(37,99,235,0.15)"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                />
                <Ionicons name="calendar-outline" size={20} color="#60a5fa" />
                <View style={styles.calIconDot} />
              </TouchableOpacity>
            </View>

            {/* ── SELECTED DAY DETAIL ─────────────────────────────── */}
            <SelectedDayCard day={selectedDay} />

            {/* ── SUMMARY CARDS ───────────────────────────────────── */}
            <Text style={styles.sectionHeading}>30-Day Overview</Text>
            <View style={styles.summaryGrid}>
              {[
                {
                  label: "Present",
                  value: summary.present,
                  color: "#4ade80",
                },
                {
                  label: "Absent",
                  value: summary.absent,
                  color: "#f87171",
                },
                {
                  label: "Late",
                  value: summary.late,
                  color: "#fbbf24",
                },
                {
                  label: "Half Day",
                  value: summary.halfDay,
                  color: "#fb923c",
                },
                {
                  label: "Leaves",
                  value: summary.leaves,
                  color: "#c084fc",
                },
                {
                  label: "Weekoffs",
                  value: summary.weekoffs,
                  color: "#94a3b8",
                },
                {
                  label: "Holidays",
                  value: summary.holidays,
                  color: "#38bdf8",
                },
                {
                  label: `${summary.attendancePercentage}%`,
                  value: "Rate",
                  color: "#a78bfa",
                  swapLabelValue: true,
                },
              ].map((item) => (
                <View key={item.label} style={styles.summaryCard}>
                  <LinearGradient
                    colors={[item.color + "15", item.color + "03"]}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                  <Text style={[styles.summaryValue, { color: item.color }]}>
                    {item.swapLabelValue ? item.label : item.value}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    {item.swapLabelValue ? item.value : item.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── TIMELINE ────────────────────────────────────────── */}
            <Text style={styles.sectionHeading}>Last 30 Days</Text>
            <View style={styles.timelineCard}>
              {timelineData.map((item, index) => {
                const cfg = STATUS_CFG[item.finalStatus] ?? STATUS_CFG.Absent;
                const d = new Date(item.date);
                const isSelected = item.date === selectedDate;
                const isToday = item.date === toDateStr(new Date());

                return (
                  <TouchableOpacity
                    key={item.date}
                    activeOpacity={0.75}
                    onPress={() => setSelectedDate(item.date)}
                  >
                    {index > 0 && <View style={styles.timelineDivider} />}
                    <View
                      style={[
                        styles.timelineRow,
                        isSelected && styles.timelineRowSelected,
                      ]}
                    >
                      {/* Date badge */}
                      <View
                        style={[
                          styles.dateBadge,
                          { backgroundColor: cfg.bg },
                          isSelected && {
                            borderWidth: 1,
                            borderColor: cfg.color,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.dateBadgeDay, { color: cfg.color }]}
                        >
                          {d.getDate()}
                        </Text>
                        <Text style={styles.dateBadgeMon}>
                          {d.toLocaleDateString("en-IN", {
                            month: "short",
                          })}
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <View style={styles.timeRow}>
                          {item.attendance?.check_in ? (
                            <>
                              <Ionicons
                                name="log-in-outline"
                                size={12}
                                color="#64748b"
                              />
                              <Text style={styles.timeText}>
                                {fmtTime(item.attendance.check_in)}
                              </Text>
                              <Feather
                                name="arrow-right"
                                size={10}
                                color="#334155"
                                style={{ marginHorizontal: 3 }}
                              />
                              <Ionicons
                                name="log-out-outline"
                                size={12}
                                color="#64748b"
                              />
                              <Text style={styles.timeText}>
                                {fmtTime(item.attendance.check_out)}
                              </Text>
                            </>
                          ) : (
                            <Text
                              style={[
                                styles.timeText,
                                { color: "#475569", fontStyle: "italic" },
                              ]}
                            >
                              {item.finalStatus === "Weekoff"
                                ? "Weekend Off"
                                : item.finalStatus === "Holiday"
                                  ? "Public Holiday"
                                  : item.finalStatus === "Leave"
                                    ? "Approved Leave"
                                    : item.finalStatus === "Pending"
                                      ? "Pending Leave"
                                      : "No Activity"}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.weekdayText}>
                          {item.weekday}
                          {isToday ? "  · Today" : ""}
                        </Text>
                      </View>

                      {/* Right side */}
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: cfg.bg },
                          ]}
                        >
                          <Text
                            style={[styles.statusText, { color: cfg.color }]}
                          >
                            {item.finalStatus}
                          </Text>
                        </View>
                        {item.attendance?.total_work_hours != null && (
                          <Text style={styles.hoursText}>
                            {item.attendance.total_work_hours.toFixed(1)}h
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* ── CALENDAR BOTTOM SHEET ──────────────────────────────────────── */}
      <CalendarSheet
        visible={showCalendar}
        markedDates={markedDates}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onClose={() => setShowCalendar(false)}
      />
    </>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loaderText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  eyebrow: {
    color: "#1d4ed8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  title: {
    color: "#f1f5f9",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  calIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.3)",
    marginTop: 4,
  },
  calIconDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
    position: "absolute",
    top: 10,
    right: 12,
    borderWidth: 1.5,
    borderColor: "#0f1f3d",
  },

  sectionHeading: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 2,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  summaryCard: {
    width: (width - 40 - 24) / 4,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    gap: 3,
  },
  summaryValue: { fontSize: 18, fontWeight: "900" },
  summaryLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  timelineCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    marginBottom: 20,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  timelineRowSelected: {
    backgroundColor: "rgba(59,130,246,0.08)",
    paddingHorizontal: 8,
    marginHorizontal: -4,
  },
  timelineDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginVertical: 2,
  },
  dateBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  dateBadgeDay: { fontSize: 15, fontWeight: "900", lineHeight: 17 },
  dateBadgeMon: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 1,
  },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { color: "#cbd5e1", fontSize: 12, fontWeight: "600" },
  weekdayText: {
    color: "#475569",
    fontSize: 11,
    marginTop: 3,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
  },
  statusText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  hoursText: { color: "#475569", fontSize: 10, fontWeight: "700" },
});

// ─── DETAIL CARD STYLES ───────────────────────────────────────────────────────
const detailStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  dayLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dateText: {
    color: "#f1f5f9",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 3,
    letterSpacing: -0.3,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: "800" },
  timeGrid: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  timeItem: { flex: 1, alignItems: "center", gap: 4 },
  timeDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.06)" },
  timeLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeValue: { fontSize: 14, fontWeight: "800" },
  noDataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  noDataText: { fontSize: 13, fontWeight: "600", flex: 1 },
});

// ─── BOTTOM SHEET STYLES ──────────────────────────────────────────────────────
const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "center",
    marginBottom: 22,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  sheetTitle: {
    color: "#f1f5f9",
    fontSize: 20,
    fontWeight: "900",
  },
  sheetSub: {
    color: "#475569",
    fontSize: 12,
    marginTop: 3,
    fontWeight: "500",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  legendRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  doneBtn: {
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginTop: 14,
  },
  doneBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
