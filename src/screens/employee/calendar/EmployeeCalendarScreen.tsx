import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import GradientScreen from "../../../components/layout/GradientScreen";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../services/supabase";
import {
  buildUnifiedMarkedDatesMatrix,
  fetchGoogleHolidaysForYear,
  computePayrollSummary,
  CALENDAR_COLORS,
} from "../../../services/calendarEngine";
import {
  LeaveRequest,
  LeaveBalance,
  CompanyHoliday,
  CalculatedPayrollSummary,
} from "../../../types/calendar";

const { width } = Dimensions.get("window");

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LEAVE_TYPES = [
  "Casual",
  "Sick",
  "Earned",
  "Comp Off",
  "Maternity",
  "Paternity",
] as const;
type LeaveType = (typeof LEAVE_TYPES)[number];

const LEAVE_COLORS: Record<string, string> = {
  Casual: "#60a5fa",
  Sick: "#f87171",
  Earned: "#4ade80",
  "Comp Off": "#a78bfa",
  Maternity: "#f472b6",
  Paternity: "#fb923c",
};

const STATUS_CONFIG = {
  Pending: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.3)",
  },
  Approved: {
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.3)",
  },
  Rejected: {
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.3)",
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function daysBetween(from: string, to: string) {
  return Math.max(
    1,
    Math.round(
      (new Date(to).getTime() - new Date(from).getTime()) /
        (1000 * 60 * 60 * 24) +
        1,
    ),
  );
}

// ─── LEAVE REQUEST MODAL ──────────────────────────────────────────────────────
function LeaveRequestModal({
  visible,
  onClose,
  onSubmitted,
  balance,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  balance: LeaveBalance | null;
}) {
  const { user } = useAuth();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const [leaveType, setLeaveType] = useState<LeaveType>("Casual");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 500,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible]);

  const totalDays = fromDate && toDate ? daysBetween(fromDate, toDate) : 0;

  const getBalance = (type: LeaveType) => {
    if (!balance) return null;
    if (type === "Casual") return balance.casual_total - balance.casual_used;
    if (type === "Sick") return balance.sick_total - balance.sick_used;
    if (type === "Earned") return balance.earned_total - balance.earned_used;
    return null;
  };
  const remaining = getBalance(leaveType);

  const handleSubmit = async () => {
    if (!fromDate || !toDate || !reason.trim()) {
      Alert.alert("Incomplete", "Please fill all fields.");
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      Alert.alert("Invalid Dates", "To date must be on or after From date.");
      return;
    }
    if (remaining !== null && totalDays > remaining) {
      Alert.alert(
        "Insufficient Balance",
        `You only have ${remaining} ${leaveType} days left.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("leave_requests").insert({
        employee_id: user!.id,
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason: reason.trim(),
        status: "Pending",
      });
      if (error) throw error;
      Alert.alert(
        "✅ Submitted",
        "Your leave request has been sent for approval.",
      );
      setFromDate("");
      setToDate("");
      setReason("");
      onSubmitted();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={lStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[lStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <LinearGradient
            colors={["#0c1628", "#0f172a"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
          />
          <View style={lStyles.handle} />

          {/* Header */}
          <View style={lStyles.sheetHeader}>
            <View>
              <Text style={lStyles.sheetTitle}>Apply for Leave</Text>
              <Text style={lStyles.sheetSub}>
                Request will be sent to admin for approval
              </Text>
            </View>
            <TouchableOpacity style={lStyles.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 480 }}
          >
            {/* Leave type selector */}
            <Text style={lStyles.fieldLabel}>LEAVE TYPE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 18 }}
            >
              <View
                style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}
              >
                {LEAVE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      lStyles.typeChip,
                      leaveType === t && {
                        borderColor: LEAVE_COLORS[t],
                        backgroundColor: LEAVE_COLORS[t] + "20",
                      },
                    ]}
                    onPress={() => setLeaveType(t)}
                  >
                    <Text
                      style={[
                        lStyles.typeChipText,
                        leaveType === t && { color: LEAVE_COLORS[t] },
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Balance indicator */}
            {remaining !== null && (
              <View style={lStyles.balanceRow}>
                <Ionicons
                  name="wallet-outline"
                  size={14}
                  color={remaining <= 2 ? "#f87171" : "#4ade80"}
                />
                <Text
                  style={[
                    lStyles.balanceText,
                    { color: remaining <= 2 ? "#f87171" : "#4ade80" },
                  ]}
                >
                  {remaining} {leaveType} days remaining
                </Text>
                {totalDays > 0 && (
                  <Text style={lStyles.balanceDelta}> · -{totalDays} days</Text>
                )}
              </View>
            )}

            {/* Date fields */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={lStyles.fieldLabel}>FROM DATE</Text>
                <View style={lStyles.inputWrap}>
                  <Feather name="calendar" size={14} color="#475569" />
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#334155"
                    value={fromDate}
                    onChangeText={setFromDate}
                    style={lStyles.input}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={lStyles.fieldLabel}>TO DATE</Text>
                <View style={lStyles.inputWrap}>
                  <Feather name="calendar" size={14} color="#475569" />
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#334155"
                    value={toDate}
                    onChangeText={setToDate}
                    style={lStyles.input}
                  />
                </View>
              </View>
            </View>

            {totalDays > 0 && (
              <View style={lStyles.daysChip}>
                <Text style={lStyles.daysChipText}>
                  {totalDays} day{totalDays > 1 ? "s" : ""} selected
                </Text>
              </View>
            )}

            {/* Reason */}
            <Text style={lStyles.fieldLabel}>REASON</Text>
            <View
              style={[
                lStyles.inputWrap,
                { height: 90, alignItems: "flex-start", paddingTop: 12 },
              ]}
            >
              <TextInput
                placeholder="Briefly describe the reason…"
                placeholderTextColor="#334155"
                value={reason}
                onChangeText={setReason}
                multiline
                style={[lStyles.input, { height: 70 }]}
              />
            </View>
          </ScrollView>

          {/* Submit */}
          <TouchableOpacity
            style={[
              lStyles.submitBtn,
              (!fromDate || !toDate || !reason.trim()) && { opacity: 0.4 },
            ]}
            onPress={handleSubmit}
            disabled={submitting || !fromDate || !toDate || !reason.trim()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#1d4ed8", "#3b82f6"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
            />
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="send" size={16} color="#fff" />
                <Text style={lStyles.submitText}>Submit Leave Request</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function EmployeeCalendarScreen() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState<
    "calendar" | "leaves" | "holidays"
  >("calendar");

  const [attendance, setAttendance] = useState<any[]>([]);
  const [googleHols, setGoogleHols] = useState<CompanyHoliday[]>([]);
  const [dbHolidays, setDbHolidays] = useState<CompanyHoliday[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [weekoffRule, setWeekoffRule] = useState<string[]>(["Sunday"]);

  const fetchAll = useCallback(
    async (silent = false) => {
      if (!user?.id) return;
      if (!silent) setLoading(true);
      try {
        const [attnRes, leaveRes, balRes, weekoffRes, dbHolRes] =
          await Promise.all([
            supabase
              .from("attendance")
              .select(
                "id, attendance_date, work_status, check_in, check_out, total_work_hours",
              )
              .eq("employee_id", user.id)
              .gte("attendance_date", `${currentYear}-01-01`)
              .lte("attendance_date", `${currentYear}-12-31`),
            supabase
              .from("leave_requests")
              .select(
                "id, leave_type, from_date, to_date, total_days, reason, status, admin_note, created_at",
              )
              .eq("employee_id", user.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("leave_balances")
              .select("*")
              .eq("employee_id", user.id)
              .eq("year", currentYear)
              .maybeSingle(),
            supabase
              .from("department_weekoffs")
              .select("weekoff_days")
              .eq("department", profile?.department ?? "IT")
              .maybeSingle(),
            supabase
              .from("company_holidays")
              .select(
                "id, title, holiday_date, holiday_type, description, is_active",
              )
              .eq("is_active", true)
              .gte("holiday_date", `${currentYear}-01-01`)
              .lte("holiday_date", `${currentYear}-12-31`)
              .order("holiday_date"),
          ]);

        setAttendance(attnRes.data ?? []);
        setLeaves((leaveRes.data ?? []) as LeaveRequest[]);
        setBalance(balRes.data ?? null);
        if (weekoffRes.data?.weekoff_days)
          setWeekoffRule(weekoffRes.data.weekoff_days);
        setDbHolidays((dbHolRes.data ?? []) as CompanyHoliday[]);

        // Fetch Google holidays (won't fail even if key missing)
        const gHols = await fetchGoogleHolidaysForYear(currentYear);
        setGoogleHols(gHols);
      } catch (e) {
        console.error("EmployeeCalendarScreen fetch:", e);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, profile?.department, currentYear],
  );

  useEffect(() => {
    fetchAll();
    if (!user?.id) return;
    const ch = supabase
      .channel(`emp-cal-${user.id}`)
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
      supabase.removeChannel(ch);
    };
  }, [fetchAll]);

  // Merge DB holidays + Google holidays (deduplicate by date)
  const allHolidays = useMemo<CompanyHoliday[]>(() => {
    const dateSet = new Set(dbHolidays.map((h) => h.holiday_date));
    const merged = [...dbHolidays];
    googleHols.forEach((h) => {
      if (!dateSet.has(h.holiday_date)) merged.push(h);
    });
    return merged.sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  }, [dbHolidays, googleHols]);

  const markedDates = useMemo(
    () =>
      buildUnifiedMarkedDatesMatrix(
        currentYear,
        currentMonth,
        attendance,
        allHolidays,
        leaves,
        weekoffRule,
      ),
    [currentYear, currentMonth, attendance, allHolidays, leaves, weekoffRule],
  );

  const payrollStats = useMemo<CalculatedPayrollSummary>(
    () =>
      computePayrollSummary(markedDates, attendance, currentYear, currentMonth),
    [markedDates, attendance, currentYear, currentMonth],
  );

  const thisMonthHolidays = useMemo(
    () =>
      allHolidays.filter((h) => {
        const d = new Date(h.holiday_date);
        return (
          d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
        );
      }),
    [allHolidays, currentYear, currentMonth],
  );

  const upcomingHolidays = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return allHolidays.filter((h) => h.holiday_date >= today).slice(0, 10);
  }, [allHolidays]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <GradientScreen>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* ── HEADER ────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>HR CALENDAR</Text>
            <Text style={styles.title}>My Calendar</Text>
          </View>
          <TouchableOpacity
            style={styles.leaveBtn}
            onPress={() => setShowLeaveModal(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#1d4ed8", "#3b82f6"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.leaveBtnText}>Apply Leave</Text>
          </TouchableOpacity>
        </View>

        {/* ── TABS ──────────────────────────────────────────────── */}
        <View style={styles.tabRow}>
          {(["calendar", "leaves", "holidays"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabPill,
                activeTab === tab && styles.tabPillActive,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              {activeTab === tab && (
                <LinearGradient
                  colors={["#1d4ed8", "#3b82f6"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                />
              )}
              <Text
                style={[styles.tabText, activeTab === tab && { color: "#fff" }]}
              >
                {tab === "calendar"
                  ? "Calendar"
                  : tab === "leaves"
                    ? `Leaves${leaves.filter((l) => l.status === "Pending").length > 0 ? ` (${leaves.filter((l) => l.status === "Pending").length})` : ""}`
                    : "Holidays"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loaderText}>Loading calendar…</Text>
          </View>
        ) : (
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
            {/* ── CALENDAR TAB ────────────────────────────────── */}
            {activeTab === "calendar" && (
              <>
                <View style={styles.calCard}>
                  <Calendar
                    theme={calTheme}
                    markingType="custom"
                    markedDates={markedDates}
                    onMonthChange={(m) => {
                      setCurrentYear(m.year);
                      setCurrentMonth(m.month);
                    }}
                  />
                </View>

                {/* Legend */}
                <View style={styles.legendWrap}>
                  {Object.values(CALENDAR_COLORS)
                    .filter(
                      (c) =>
                        c.label !== "Pending Leave" && c.label !== "Future",
                    )
                    .map((c) => (
                      <View key={c.label} style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: c.bg, borderColor: c.color },
                          ]}
                        />
                        <Text style={styles.legendText}>{c.label}</Text>
                      </View>
                    ))}
                </View>

                {/* Payroll Summary */}
                <Text style={styles.sectionTitle}>Monthly Summary</Text>
                <View style={styles.statsGrid}>
                  {[
                    {
                      label: "Working Days",
                      value: payrollStats.workingDays,
                      color: "#60a5fa",
                    },
                    {
                      label: "Attendance %",
                      value: `${payrollStats.attendanceRate}%`,
                      color: "#a78bfa",
                    },
                    {
                      label: "Present",
                      value: payrollStats.present + payrollStats.late,
                      color: "#4ade80",
                    },
                    {
                      label: "Absent",
                      value: payrollStats.absent,
                      color: "#f87171",
                    },
                    {
                      label: "Weekoffs",
                      value: payrollStats.weekoffs,
                      color: "#94a3b8",
                    },
                    {
                      label: "Holidays",
                      value: payrollStats.holidays,
                      color: "#60a5fa",
                    },
                  ].map((s) => (
                    <View key={s.label} style={styles.statCell}>
                      <LinearGradient
                        colors={[s.color + "15", "transparent"]}
                        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                      />
                      <Text style={[styles.statValue, { color: s.color }]}>
                        {s.value}
                      </Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Leave balance */}
                <Text style={styles.sectionTitle}>
                  Leave Balance ({currentYear})
                </Text>
                <View style={styles.balanceCard}>
                  <LinearGradient
                    colors={["rgba(37,99,235,0.12)", "transparent"]}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                  {[
                    {
                      type: "Casual",
                      total: balance?.casual_total ?? 12,
                      used: balance?.casual_used ?? 0,
                      color: "#60a5fa",
                    },
                    {
                      type: "Sick",
                      total: balance?.sick_total ?? 10,
                      used: balance?.sick_used ?? 0,
                      color: "#f87171",
                    },
                    {
                      type: "Earned",
                      total: balance?.earned_total ?? 15,
                      used: balance?.earned_used ?? 0,
                      color: "#4ade80",
                    },
                  ].map((b, i) => (
                    <View key={b.type}>
                      {i > 0 && <View style={styles.balDivider} />}
                      <View style={styles.balRow}>
                        <Text style={styles.balType}>{b.type}</Text>
                        <View style={styles.balTrack}>
                          <View
                            style={[
                              styles.balFill,
                              {
                                width: `${(b.used / b.total) * 100}%`,
                                backgroundColor: b.color,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.balCount, { color: b.color }]}>
                          {b.total - b.used}
                          <Text style={styles.balTotal}>/{b.total}</Text>
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── LEAVES TAB ──────────────────────────────────── */}
            {activeTab === "leaves" && (
              <>
                {/* Balance cards */}
                <View style={styles.leaveBalRow}>
                  {[
                    {
                      type: "Casual",
                      remaining:
                        (balance?.casual_total ?? 12) -
                        (balance?.casual_used ?? 0),
                      color: "#60a5fa",
                    },
                    {
                      type: "Sick",
                      remaining:
                        (balance?.sick_total ?? 10) - (balance?.sick_used ?? 0),
                      color: "#f87171",
                    },
                    {
                      type: "Earned",
                      remaining:
                        (balance?.earned_total ?? 15) -
                        (balance?.earned_used ?? 0),
                      color: "#4ade80",
                    },
                  ].map((b) => (
                    <View
                      key={b.type}
                      style={[
                        styles.leaveBalCard,
                        { borderColor: b.color + "30" },
                      ]}
                    >
                      <LinearGradient
                        colors={[b.color + "18", "transparent"]}
                        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                      />
                      <Text style={[styles.leaveBalValue, { color: b.color }]}>
                        {b.remaining}
                      </Text>
                      <Text style={styles.leaveBalLabel}>{b.type}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.applyLeaveCard}
                  onPress={() => setShowLeaveModal(true)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["rgba(37,99,235,0.2)", "rgba(37,99,235,0.08)"]}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#60a5fa"
                  />
                  <Text style={styles.applyLeaveText}>Apply for New Leave</Text>
                  <Feather
                    name="arrow-right"
                    size={16}
                    color="#60a5fa"
                    style={{ marginLeft: "auto" }}
                  />
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>Leave History</Text>
                {leaves.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons
                      name="calendar-outline"
                      size={36}
                      color="#1e3a5f"
                    />
                    <Text style={styles.emptyText}>No leave requests yet</Text>
                  </View>
                ) : (
                  leaves.map((l) => {
                    const cfg =
                      STATUS_CONFIG[l.status] ?? STATUS_CONFIG.Pending;
                    return (
                      <View key={l.id} style={styles.leaveCard}>
                        <LinearGradient
                          colors={[cfg.bg, "transparent"]}
                          style={[
                            StyleSheet.absoluteFill,
                            { borderRadius: 20 },
                          ]}
                        />
                        <View style={styles.leaveCardTop}>
                          <View
                            style={[
                              styles.leaveTypeBadge,
                              {
                                backgroundColor:
                                  (LEAVE_COLORS[l.leave_type] ?? "#60a5fa") +
                                  "20",
                                borderColor:
                                  (LEAVE_COLORS[l.leave_type] ?? "#60a5fa") +
                                  "40",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.leaveTypeBadgeText,
                                {
                                  color:
                                    LEAVE_COLORS[l.leave_type] ?? "#60a5fa",
                                },
                              ]}
                            >
                              {l.leave_type}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusPill,
                              {
                                backgroundColor: cfg.bg,
                                borderColor: cfg.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                { color: cfg.color },
                              ]}
                            >
                              {l.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.leaveDatesRow}>
                          <Feather name="calendar" size={12} color="#475569" />
                          <Text style={styles.leaveDates}>
                            {fmtDate(l.from_date)} → {fmtDate(l.to_date)}
                          </Text>
                          <View style={styles.leaveDaysPill}>
                            <Text style={styles.leaveDaysText}>
                              {l.total_days ??
                                daysBetween(l.from_date, l.to_date)}
                              d
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.leaveReason} numberOfLines={2}>
                          {l.reason}
                        </Text>
                        {l.admin_note && (
                          <View style={styles.adminNoteWrap}>
                            <Ionicons
                              name="chatbubble-outline"
                              size={11}
                              color="#64748b"
                            />
                            <Text style={styles.adminNoteText}>
                              {l.admin_note}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </>
            )}

            {/* ── HOLIDAYS TAB ────────────────────────────────── */}
            {activeTab === "holidays" && (
              <>
                <Text style={styles.sectionTitle}>Upcoming Holidays</Text>
                {upcomingHolidays.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="flag-outline" size={36} color="#1e3a5f" />
                    <Text style={styles.emptyText}>No upcoming holidays</Text>
                  </View>
                ) : (
                  upcomingHolidays.map((h) => (
                    <View key={h.id} style={styles.holidayCard}>
                      <LinearGradient
                        colors={["rgba(96,165,250,0.1)", "transparent"]}
                        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                      />
                      <View style={styles.holidayDateBadge}>
                        <Text style={styles.holidayDay}>
                          {new Date(h.holiday_date).getDate()}
                        </Text>
                        <Text style={styles.holidayMon}>
                          {new Date(h.holiday_date).toLocaleDateString(
                            "en-IN",
                            { month: "short" },
                          )}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.holidayTitle}>{h.title}</Text>
                        <Text style={styles.holidayType}>
                          {h.holiday_type} Holiday
                        </Text>
                        {h.description ? (
                          <Text style={styles.holidayDesc} numberOfLines={1}>
                            {h.description}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.holidayTypeBadge,
                          {
                            backgroundColor:
                              h.holiday_type === "Public"
                                ? "rgba(96,165,250,0.15)"
                                : "rgba(167,139,250,0.15)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.holidayTypeBadgeText,
                            {
                              color:
                                h.holiday_type === "Public"
                                  ? "#60a5fa"
                                  : "#a78bfa",
                            },
                          ]}
                        >
                          {h.holiday_type}
                        </Text>
                      </View>
                    </View>
                  ))
                )}

                {/* Weekoff info */}
                <Text style={styles.sectionTitle}>Your Weekoffs</Text>
                <View style={styles.weekoffCard}>
                  <LinearGradient
                    colors={["rgba(148,163,184,0.1)", "transparent"]}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                  <Ionicons name="cafe-outline" size={20} color="#94a3b8" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.weekoffTitle}>
                      {profile?.department ?? "Your Dept"} Weekoffs
                    </Text>
                    <Text style={styles.weekoffDays}>
                      {weekoffRule.join(" & ")}
                    </Text>
                  </View>
                  <View style={styles.weekoffCountBadge}>
                    <Text style={styles.weekoffCountText}>
                      {weekoffRule.length}d/wk
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <LeaveRequestModal
        visible={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onSubmitted={() => fetchAll(true)}
        balance={balance}
      />
    </GradientScreen>
  );
}

// ─── CALENDAR THEME ───────────────────────────────────────────────────────────
const calTheme = {
  backgroundColor: "transparent",
  calendarBackground: "transparent",
  textSectionTitleColor: "#334155",
  todayTextColor: "#3b82f6",
  dayTextColor: "#94a3b8",
  textDisabledColor: "#1e293b",
  arrowColor: "#3b82f6",
  monthTextColor: "#f1f5f9",
  textDayFontWeight: "600" as const,
  textMonthFontWeight: "900" as const,
  selectedDayBackgroundColor: "#2563eb",
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingBottom: 120 },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loaderText: { color: "#475569", fontSize: 13 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  eyebrow: {
    color: "#1d4ed8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  title: {
    color: "#f1f5f9",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
  },
  leaveBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 18,
    gap: 6,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 4,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    overflow: "hidden",
  },
  tabPillActive: {},
  tabText: { color: "#475569", fontSize: 12, fontWeight: "700" },

  calCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 8,
    marginBottom: 14,
  },

  legendWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 18,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: "30%",
  },
  legendDot: { width: 10, height: 10, borderRadius: 4, borderWidth: 1 },
  legendText: { color: "#64748b", fontSize: 9, fontWeight: "600" },

  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 4,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  statCell: {
    width: (width - 56) / 3,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  balanceCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    overflow: "hidden",
    marginBottom: 18,
  },
  balDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 12,
  },
  balRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  balType: { color: "#64748b", fontSize: 12, fontWeight: "700", width: 52 },
  balTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  balFill: { height: 6, borderRadius: 3 },
  balCount: { fontSize: 14, fontWeight: "900", width: 36, textAlign: "right" },
  balTotal: { color: "#334155", fontSize: 11, fontWeight: "500" },

  leaveBalRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  leaveBalCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    gap: 4,
  },
  leaveBalValue: { fontSize: 26, fontWeight: "900" },
  leaveBalLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  applyLeaveCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    overflow: "hidden",
    marginBottom: 20,
  },
  applyLeaveText: { color: "#60a5fa", fontSize: 14, fontWeight: "700" },

  leaveCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  leaveCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  leaveTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  leaveTypeBadgeText: { fontSize: 11, fontWeight: "800" },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 11, fontWeight: "800" },
  leaveDatesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  leaveDates: { color: "#64748b", fontSize: 12, flex: 1 },
  leaveDaysPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(96,165,250,0.12)",
  },
  leaveDaysText: { color: "#60a5fa", fontSize: 10, fontWeight: "800" },
  leaveReason: { color: "#475569", fontSize: 12, lineHeight: 18 },
  adminNoteWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  adminNoteText: { color: "#64748b", fontSize: 11, flex: 1 },

  holidayCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.2)",
    overflow: "hidden",
    gap: 14,
  },
  holidayDateBadge: { width: 46, alignItems: "center", gap: 0 },
  holidayDay: {
    color: "#60a5fa",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
  },
  holidayMon: {
    color: "#334155",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  holidayTitle: { color: "#f1f5f9", fontSize: 14, fontWeight: "700" },
  holidayType: { color: "#475569", fontSize: 11, marginTop: 2 },
  holidayDesc: { color: "#334155", fontSize: 10, marginTop: 2 },
  holidayTypeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
  },
  holidayTypeBadgeText: { fontSize: 10, fontWeight: "800" },

  weekoffCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    overflow: "hidden",
    marginBottom: 10,
  },
  weekoffTitle: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },
  weekoffDays: { color: "#64748b", fontSize: 12, marginTop: 2 },
  weekoffCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(148,163,184,0.12)",
  },
  weekoffCountText: { color: "#94a3b8", fontSize: 12, fontWeight: "800" },

  emptyWrap: { alignItems: "center", paddingVertical: 50, gap: 12 },
  emptyText: { color: "#334155", fontSize: 13, fontWeight: "600" },
});

// ─── LEAVE MODAL STYLES ───────────────────────────────────────────────────────
const lStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    overflow: "hidden",
    minHeight: 520,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 10,
  },
  sheetTitle: { color: "#f1f5f9", fontSize: 20, fontWeight: "900" },
  sheetSub: { color: "#475569", fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  fieldLabel: {
    color: "#1d4ed8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  typeChipText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  balanceText: { fontSize: 12, fontWeight: "700" },
  balanceDelta: { color: "#f87171", fontSize: 11 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  input: { flex: 1, color: "#e2e8f0", fontSize: 13 },
  daysChip: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(37,99,235,0.15)",
    marginBottom: 16,
  },
  daysChipText: { color: "#60a5fa", fontSize: 12, fontWeight: "800" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 18,
    marginTop: 20,
    overflow: "hidden",
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
