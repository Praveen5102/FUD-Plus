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
import { supabase } from "../../../services/supabase";
import {
  buildUnifiedMarkedDatesMatrix,
  fetchGoogleHolidaysForYear,
  CALENDAR_COLORS,
} from "../../../services/calendarEngine";
import { LeaveRequest, CompanyHoliday } from "../../../types/calendar";

const { width } = Dimensions.get("window");

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; border: string }
> = {
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

const LEAVE_COLORS: Record<string, string> = {
  Casual: "#60a5fa",
  Sick: "#f87171",
  Earned: "#4ade80",
  "Comp Off": "#a78bfa",
  Maternity: "#f472b6",
  Paternity: "#fb923c",
};

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

// ─── ADD HOLIDAY MODAL ────────────────────────────────────────────────────────
function AddHolidayModal({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<"Public" | "Company" | "Optional">("Public");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible]);

  const handleSave = async () => {
    if (!title.trim() || !date.trim()) {
      Alert.alert("Required", "Title and date are required.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Invalid Date", "Use YYYY-MM-DD format.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("company_holidays").insert({
        title: title.trim(),
        holiday_date: date,
        holiday_type: type,
        description: desc.trim() || null,
        is_active: true,
      });
      if (error) throw error;
      setTitle("");
      setDate("");
      setDesc("");
      setType("Public");
      onAdded();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to add holiday.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={hStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[hStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <LinearGradient
            colors={["#0c1628", "#0f172a"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
          />
          <View style={hStyles.handle} />
          <View style={hStyles.header}>
            <Text style={hStyles.title}>Add Holiday</Text>
            <TouchableOpacity style={hStyles.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <Text style={hStyles.label}>HOLIDAY NAME</Text>
          <View style={hStyles.inputWrap}>
            <Feather name="flag" size={14} color="#475569" />
            <TextInput
              placeholder="e.g. Diwali"
              placeholderTextColor="#334155"
              value={title}
              onChangeText={setTitle}
              style={hStyles.input}
            />
          </View>

          <Text style={hStyles.label}>DATE (YYYY-MM-DD)</Text>
          <View style={hStyles.inputWrap}>
            <Feather name="calendar" size={14} color="#475569" />
            <TextInput
              placeholder="2025-10-20"
              placeholderTextColor="#334155"
              value={date}
              onChangeText={setDate}
              style={hStyles.input}
            />
          </View>

          <Text style={hStyles.label}>TYPE</Text>
          <View style={hStyles.typeRow}>
            {(["Public", "Company", "Optional"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[hStyles.typeBtn, type === t && hStyles.typeBtnActive]}
                onPress={() => setType(t)}
              >
                {type === t && (
                  <LinearGradient
                    colors={["#1d4ed8", "#3b82f6"]}
                    style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                  />
                )}
                <Text
                  style={[hStyles.typeBtnText, type === t && { color: "#fff" }]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={hStyles.label}>DESCRIPTION (OPTIONAL)</Text>
          <View style={hStyles.inputWrap}>
            <TextInput
              placeholder="Additional info…"
              placeholderTextColor="#334155"
              value={desc}
              onChangeText={setDesc}
              style={hStyles.input}
            />
          </View>

          <TouchableOpacity
            style={[hStyles.saveBtn, (!title || !date) && { opacity: 0.4 }]}
            onPress={handleSave}
            disabled={saving || !title || !date}
          >
            <LinearGradient
              colors={["#1d4ed8", "#3b82f6"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
            />
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="plus" size={16} color="#fff" />
                <Text style={hStyles.saveBtnText}>Add Holiday</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── LEAVE REVIEW MODAL ───────────────────────────────────────────────────────
function LeaveReviewModal({
  leave,
  visible,
  onClose,
  onReviewed,
}: {
  leave: LeaveRequest | null;
  visible: boolean;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    if (visible) setNote("");
  }, [visible]);

  const handleReview = async (action: "Approved" | "Rejected") => {
    if (!leave) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: action,
          admin_note: note.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", leave.id);
      if (error) throw error;
      onReviewed();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to update leave.");
    } finally {
      setLoading(false);
    }
  };

  if (!leave) return null;
  const profile = leave.profiles;
  const cfg = STATUS_CONFIG[leave.status] ?? STATUS_CONFIG.Pending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={rStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[rStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <LinearGradient
            colors={["#0c1628", "#0f172a"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
          />
          <View style={rStyles.handle} />

          <View style={rStyles.header}>
            <Text style={rStyles.title}>Review Leave Request</Text>
            <TouchableOpacity style={rStyles.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Employee info */}
          <View style={rStyles.empRow}>
            <View style={rStyles.empAvatar}>
              <Text style={rStyles.empInitials}>
                {(profile?.full_name ?? "??")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rStyles.empName}>{profile?.full_name ?? "—"}</Text>
              <Text style={rStyles.empDept}>
                {profile?.department ?? "—"} · {profile?.employee_id ?? "—"}
              </Text>
            </View>
            <View
              style={[
                rStyles.statusPill,
                { backgroundColor: cfg.bg, borderColor: cfg.border },
              ]}
            >
              <Text style={[rStyles.statusPillText, { color: cfg.color }]}>
                {leave.status}
              </Text>
            </View>
          </View>

          {/* Leave details */}
          <View style={rStyles.detailsCard}>
            <LinearGradient
              colors={["rgba(255,255,255,0.04)", "transparent"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
            />
            <View style={rStyles.detailRow}>
              <Text style={rStyles.detailLabel}>Type</Text>
              <Text
                style={[
                  rStyles.detailValue,
                  { color: LEAVE_COLORS[leave.leave_type] ?? "#60a5fa" },
                ]}
              >
                {leave.leave_type}
              </Text>
            </View>
            <View style={rStyles.detailDivider} />
            <View style={rStyles.detailRow}>
              <Text style={rStyles.detailLabel}>Duration</Text>
              <Text style={rStyles.detailValue}>
                {fmtDate(leave.from_date)} → {fmtDate(leave.to_date)}
              </Text>
            </View>
            <View style={rStyles.detailDivider} />
            <View style={rStyles.detailRow}>
              <Text style={rStyles.detailLabel}>Days</Text>
              <Text style={[rStyles.detailValue, { color: "#fbbf24" }]}>
                {leave.total_days ??
                  daysBetween(leave.from_date, leave.to_date)}{" "}
                days
              </Text>
            </View>
            <View style={rStyles.detailDivider} />
            <View style={rStyles.detailRow}>
              <Text style={rStyles.detailLabel}>Reason</Text>
              <Text
                style={[rStyles.detailValue, { flex: 1, textAlign: "right" }]}
              >
                {leave.reason}
              </Text>
            </View>
          </View>

          {/* Admin note */}
          <Text style={rStyles.fieldLabel}>ADMIN NOTE (OPTIONAL)</Text>
          <View style={rStyles.inputWrap}>
            <TextInput
              placeholder="Add a note for the employee…"
              placeholderTextColor="#334155"
              value={note}
              onChangeText={setNote}
              style={rStyles.input}
            />
          </View>

          {/* Action buttons */}
          {leave.status === "Pending" && (
            <View style={rStyles.actionRow}>
              <TouchableOpacity
                style={rStyles.rejectBtn}
                onPress={() => handleReview("Rejected")}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Feather name="x-circle" size={16} color="#f87171" />
                <Text style={rStyles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={rStyles.approveBtn}
                onPress={() => handleReview("Approved")}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#059669", "#4ade80"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                />
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="check-circle" size={16} color="#fff" />
                    <Text style={rStyles.approveText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function AdminCalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [selectedDept, setSelectedDept] = useState("All");
  const [activeTab, setActiveTab] = useState<
    "calendar" | "leaves" | "holidays"
  >("calendar");
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [reviewLeave, setReviewLeave] = useState<LeaveRequest | null>(null);

  const [departments, setDepartments] = useState<string[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [googleHols, setGoogleHols] = useState<CompanyHoliday[]>([]);
  const [dbHolidays, setDbHolidays] = useState<CompanyHoliday[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [weekoffRules, setWeekoffRules] = useState<Record<string, string[]>>(
    {},
  );

  const fetchAll = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [empRes, attnRes, leaveRes, holRes, weekoffRes] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("id, department")
              .eq("role", "employee"),

            supabase
              .from("attendance")
              .select(
                "id, employee_id, attendance_date, work_status, profiles!attendance_employee_id_fkey(department)",
              )
              .gte("attendance_date", `${currentYear}-01-01`)
              .lte("attendance_date", `${currentYear}-12-31`),

            // ✅ FIX: explicitly specify the FK to avoid PGRST201 ambiguous relationship error
            supabase
              .from("leave_requests")
              .select(
                `id, employee_id, leave_type, from_date, to_date, total_days,
                 reason, status, admin_note, reviewed_at, created_at,
                 profiles!leave_requests_employee_id_fkey(
                   full_name, department, employee_id, profile_image
                 )`,
              )
              .order("created_at", { ascending: false }),

            supabase
              .from("company_holidays")
              .select(
                "id, title, holiday_date, holiday_type, description, is_active",
              )
              .eq("is_active", true)
              .gte("holiday_date", `${currentYear}-01-01`)
              .lte("holiday_date", `${currentYear}-12-31`)
              .order("holiday_date"),

            supabase
              .from("department_weekoffs")
              .select("department, weekoff_days"),
          ]);

        // Log any errors for debugging
        if (empRes.error)
          console.error("[AdminCalendar] profiles error:", empRes.error);
        if (attnRes.error)
          console.error("[AdminCalendar] attendance error:", attnRes.error);
        if (leaveRes.error)
          console.error(
            "[AdminCalendar] leave_requests error:",
            leaveRes.error,
          );
        if (holRes.error)
          console.error(
            "[AdminCalendar] company_holidays error:",
            holRes.error,
          );
        if (weekoffRes.error)
          console.error(
            "[AdminCalendar] department_weekoffs error:",
            weekoffRes.error,
          );

        // Departments
        const depts = [
          ...new Set(
            (empRes.data ?? []).map((e: any) => e.department).filter(Boolean),
          ),
        ].sort() as string[];
        setDepartments(depts);

        // Attendance
        setAllAttendance(attnRes.data ?? []);

        // ✅ Normalise leave profiles — Supabase may return array or object
        const normalisedLeaves = (leaveRes.data ?? []).map((row: any) => ({
          ...row,
          profiles: Array.isArray(row.profiles)
            ? (row.profiles[0] ?? null)
            : (row.profiles ?? null),
        })) as LeaveRequest[];
        setAllLeaves(normalisedLeaves);

        // Holidays from DB
        setDbHolidays((holRes.data ?? []) as CompanyHoliday[]);

        // Weekoff rules
        const ruleMap: Record<string, string[]> = {};

        (weekoffRes.data ?? []).forEach((row: any) => {
          // Normalize DB values

          const departmentName = row?.department?.toString()?.trim();

          // Parse weekoff days safely

          let parsedWeekoffs: string[] = [];

          if (Array.isArray(row.weekoff_days)) {
            parsedWeekoffs = row.weekoff_days;
          } else if (typeof row.weekoff_days === "string") {
            try {
              parsedWeekoffs = JSON.parse(row.weekoff_days);
            } catch {
              parsedWeekoffs = [row.weekoff_days];
            }
          }

          // Store only valid departments

          if (departmentName) {
            ruleMap[departmentName] = parsedWeekoffs;
          }
        });

        // Google holidays (non-blocking)
        const gHols = await fetchGoogleHolidaysForYear(currentYear);
        setGoogleHols(gHols);
      } catch (e) {
        console.error("[AdminCalendarScreen] fetchAll error:", e);
      } finally {
        setLoading(false);
      }
    },
    [currentYear],
  );

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("admin-calendar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leave_requests" },
        () => fetchAll(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_holidays" },
        () => fetchAll(true),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchAll]);

  // ── DERIVED DATA ────────────────────────────────────────────────────────────

  const allHolidays = useMemo<
    (CompanyHoliday & { isGoogleOnly?: boolean })[]
  >(() => {
    const dbDateSet = new Set(dbHolidays.map((h) => h.holiday_date));
    const merged: (CompanyHoliday & { isGoogleOnly?: boolean })[] = [
      ...dbHolidays,
    ];
    googleHols.forEach((h) => {
      if (!dbDateSet.has(h.holiday_date))
        merged.push({ ...h, isGoogleOnly: true });
    });
    return merged.sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  }, [dbHolidays, googleHols]);

  const weekoffForDept = useMemo(() => {
    try {
      // ALL departments view

      if (selectedDept === "All") {
        return ["Saturday", "Sunday"];
      }

      // No rules

      if (!weekoffRules || Object.keys(weekoffRules).length === 0) {
        return ["Sunday"];
      }

      // Direct exact match first

      if (weekoffRules[selectedDept]) {
        const directRule = weekoffRules[selectedDept];

        if (Array.isArray(directRule) && directRule.length > 0) {
          return directRule;
        }
      }

      // Case-insensitive fallback

      const matchedKey = Object.keys(weekoffRules).find(
        (key) => key.trim().toLowerCase() === selectedDept.trim().toLowerCase(),
      );

      if (matchedKey) {
        const matchedRule = weekoffRules[matchedKey];

        if (Array.isArray(matchedRule) && matchedRule.length > 0) {
          return matchedRule;
        }
      }

      // Final fallback

      return ["Sunday"];
    } catch (error) {
      console.log("Weekoff calculation error:", error);

      return ["Sunday"];
    }
  }, [selectedDept, weekoffRules]);

  const filteredAttn = useMemo(
    () =>
      selectedDept === "All"
        ? allAttendance
        : allAttendance.filter((a: any) => {
            const p = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
            return p?.department === selectedDept;
          }),
    [allAttendance, selectedDept],
  );

  const filteredLeaves = useMemo(
    () =>
      selectedDept === "All"
        ? allLeaves
        : allLeaves.filter(
            (l) => (l.profiles as any)?.department === selectedDept,
          ),
    [allLeaves, selectedDept],
  );

  const markedDates = useMemo(
    () =>
      buildUnifiedMarkedDatesMatrix(
        currentYear,
        currentMonth,
        filteredAttn,
        allHolidays,
        filteredLeaves,
        weekoffForDept,
      ),
    [
      currentYear,
      currentMonth,
      filteredAttn,
      allHolidays,
      filteredLeaves,
      weekoffForDept,
    ],
  );

  const pendingLeaves = useMemo(
    () => allLeaves.filter((l) => l.status === "Pending"),
    [allLeaves],
  );

  const upcomingHols = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return allHolidays.filter((h) => h.holiday_date >= today).slice(0, 15);
  }, [allHolidays]);

  // ── HANDLERS ────────────────────────────────────────────────────────────────

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const deleteHoliday = async (
    id: string,
    isGoogleOnly: boolean,
    holiday?: CompanyHoliday & { isGoogleOnly?: boolean },
  ) => {
    Alert.alert("Remove Holiday", "Remove this holiday from the calendar?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (isGoogleOnly && holiday) {
            const { data: existing } = await supabase
              .from("company_holidays")
              .select("id")
              .eq("holiday_date", holiday.holiday_date)
              .maybeSingle();
            if (existing) {
              await supabase
                .from("company_holidays")
                .update({ is_active: false })
                .eq("id", existing.id);
            } else {
              await supabase.from("company_holidays").insert({
                title: holiday.title,
                holiday_date: holiday.holiday_date,
                holiday_type: holiday.holiday_type,
                description: holiday.description ?? null,
                is_active: false,
              });
            }
          } else {
            await supabase
              .from("company_holidays")
              .update({ is_active: false })
              .eq("id", id);
          }
          fetchAll(true);
        },
      },
    ]);
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  const deptTabs = ["All", ...departments];

  return (
    <GradientScreen>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ADMIN · WORKFORCE</Text>
            <Text style={styles.title}>Team Calendar</Text>
          </View>
          <View style={styles.headerActions}>
            {pendingLeaves.length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  {pendingLeaves.length}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.addHolBtn}
              onPress={() => setShowAddHoliday(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#1d4ed8", "#3b82f6"]}
                style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
              />
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.addHolText}>Holiday</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── DEPT FILTER ─────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.deptScroll}
          contentContainerStyle={{
            paddingHorizontal: 18,
            gap: 8,
            paddingVertical: 4,
          }}
        >
          {deptTabs.map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.deptChip,
                selectedDept === d && styles.deptChipActive,
              ]}
              onPress={() => setSelectedDept(d)}
            >
              {selectedDept === d && (
                <LinearGradient
                  colors={["#1d4ed8", "#3b82f6"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                />
              )}
              <Text
                style={[
                  styles.deptChipText,
                  selectedDept === d && { color: "#fff" },
                ]}
              >
                {d}
              </Text>
              {d !== "All" && weekoffRules[d] && (
                <Text
                  style={[
                    styles.deptWeekoffText,
                    selectedDept === d && {
                      color: "rgba(255,255,255,0.6)",
                    },
                  ]}
                >
                  {weekoffRules[d].length}d off
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── TABS ────────────────────────────────────────────────── */}
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
                {tab === "leaves"
                  ? `Leaves${
                      pendingLeaves.length > 0
                        ? ` (${pendingLeaves.length})`
                        : ""
                    }`
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
            {/* ── CALENDAR TAB ──────────────────────────────────── */}
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
                            {
                              backgroundColor: c.bg,
                              borderColor: c.color,
                            },
                          ]}
                        />
                        <Text style={styles.legendText}>{c.label}</Text>
                      </View>
                    ))}
                </View>

                {/* Weekoff info */}
                <View style={styles.weekoffInfoCard}>
                  <LinearGradient
                    colors={["rgba(148,163,184,0.1)", "transparent"]}
                    style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                  />
                  <Ionicons name="cafe-outline" size={18} color="#94a3b8" />
                  <Text style={styles.weekoffInfoText}>
                    {selectedDept === "All"
                      ? "Default: Sat + Sun off"
                      : `${selectedDept}: ${weekoffForDept.join(" & ")} off (${
                          weekoffForDept.length
                        } day${weekoffForDept.length > 1 ? "s" : ""}/week)`}
                  </Text>
                </View>
              </>
            )}

            {/* ── LEAVES TAB ────────────────────────────────────── */}
            {activeTab === "leaves" && (
              <>
                {pendingLeaves.length > 0 && (
                  <>
                    <View style={styles.pendingHeader}>
                      <View style={styles.pendingDot} />
                      <Text style={styles.pendingTitle}>
                        Pending Approval ({pendingLeaves.length})
                      </Text>
                    </View>
                    {pendingLeaves.map((l) => (
                      <LeaveRow
                        key={l.id}
                        leave={l}
                        onPress={() => setReviewLeave(l)}
                      />
                    ))}
                    <View style={styles.separator} />
                  </>
                )}

                <Text style={styles.sectionTitle}>All Leave Requests</Text>
                {filteredLeaves.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons
                      name="calendar-outline"
                      size={36}
                      color="#1e3a5f"
                    />
                    <Text style={styles.emptyText}>No leave requests</Text>
                  </View>
                ) : (
                  filteredLeaves.map((l) => (
                    <LeaveRow
                      key={l.id}
                      leave={l}
                      onPress={() => setReviewLeave(l)}
                    />
                  ))
                )}
              </>
            )}

            {/* ── HOLIDAYS TAB ──────────────────────────────────── */}
            {activeTab === "holidays" && (
              <>
                <TouchableOpacity
                  style={styles.addHolCard}
                  onPress={() => setShowAddHoliday(true)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["rgba(37,99,235,0.2)", "rgba(37,99,235,0.06)"]}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#60a5fa"
                  />
                  <Text style={styles.addHolCardText}>Add Company Holiday</Text>
                  <Feather
                    name="arrow-right"
                    size={16}
                    color="#60a5fa"
                    style={{ marginLeft: "auto" }}
                  />
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>Upcoming Holidays</Text>
                {upcomingHols.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="flag-outline" size={36} color="#1e3a5f" />
                    <Text style={styles.emptyText}>No holidays configured</Text>
                    <Text style={styles.emptySubText}>
                      Add holidays above or configure Google Calendar API key
                    </Text>
                  </View>
                ) : (
                  upcomingHols.map((h) => (
                    <View key={h.id} style={styles.holCard}>
                      <LinearGradient
                        colors={["rgba(96,165,250,0.08)", "transparent"]}
                        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                      />
                      <View style={styles.holDateBadge}>
                        <Text style={styles.holDay}>
                          {new Date(h.holiday_date).getDate()}
                        </Text>
                        <Text style={styles.holMon}>
                          {new Date(h.holiday_date).toLocaleDateString(
                            "en-IN",
                            { month: "short" },
                          )}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.holTitle}>{h.title}</Text>
                        <Text style={styles.holType}>
                          {h.holiday_type} Holiday
                        </Text>
                        {h.description ? (
                          <Text style={styles.holDesc} numberOfLines={1}>
                            {h.description}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={styles.holDeleteBtn}
                        onPress={() =>
                          deleteHoliday(h.id, !!(h as any).isGoogleOnly, h)
                        }
                      >
                        <Feather name="trash-2" size={14} color="#f87171" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <AddHolidayModal
        visible={showAddHoliday}
        onClose={() => setShowAddHoliday(false)}
        onAdded={() => fetchAll(true)}
      />
      <LeaveReviewModal
        leave={reviewLeave}
        visible={!!reviewLeave}
        onClose={() => setReviewLeave(null)}
        onReviewed={() => {
          fetchAll(true);
          setReviewLeave(null);
        }}
      />
    </GradientScreen>
  );
}

// ─── LEAVE ROW COMPONENT ──────────────────────────────────────────────────────
function LeaveRow({
  leave,
  onPress,
}: {
  leave: LeaveRequest;
  onPress: () => void;
}) {
  const profile = leave.profiles as any;
  const cfg = STATUS_CONFIG[leave.status] ?? STATUS_CONFIG.Pending;
  return (
    <TouchableOpacity
      style={styles.leaveCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[cfg.bg, "transparent"]}
        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
      />
      <View style={styles.leaveCardLeft}>
        <View style={styles.leaveAvatar}>
          <Text style={styles.leaveAvatarText}>
            {(profile?.full_name ?? "??")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.leaveName}>{profile?.full_name ?? "—"}</Text>
          <Text style={styles.leaveMeta}>
            {profile?.department ?? "—"} · {leave.leave_type}
          </Text>
          <Text style={styles.leaveDates}>
            {fmtDate(leave.from_date)} → {fmtDate(leave.to_date)}
          </Text>
        </View>
      </View>
      <View style={styles.leaveRight}>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          <Text style={[styles.statusPillText, { color: cfg.color }]}>
            {leave.status}
          </Text>
        </View>
        <Text style={styles.leaveDaysCount}>
          {leave.total_days ?? daysBetween(leave.from_date, leave.to_date)}d
        </Text>
        {leave.status === "Pending" && (
          <Feather name="chevron-right" size={14} color="#475569" />
        )}
      </View>
    </TouchableOpacity>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  pendingBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fbbf24",
    justifyContent: "center",
    alignItems: "center",
  },
  pendingBadgeText: { color: "#000", fontSize: 11, fontWeight: "900" },
  addHolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    overflow: "hidden",
  },
  addHolText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  deptScroll: {
    marginBottom: 14,
    minHeight: 50,
    maxHeight: 70,
  },
  deptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    overflow: "hidden",
  },
  deptChipActive: {},
  deptChipText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  deptWeekoffText: { color: "#334155", fontSize: 9, fontWeight: "600" },

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
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: "30%",
  },
  legendDot: { width: 10, height: 10, borderRadius: 4, borderWidth: 1 },
  legendText: { color: "#64748b", fontSize: 9, fontWeight: "600" },

  weekoffInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    overflow: "hidden",
  },
  weekoffInfoText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fbbf24",
  },
  pendingTitle: { color: "#fbbf24", fontSize: 14, fontWeight: "800" },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 16,
  },
  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },

  leaveCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  leaveCardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  leaveAvatar: {
    width: 44,
    height: 44,
    minWidth: 44,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  leaveAvatarText: { color: "#60a5fa", fontSize: 14, fontWeight: "900" },
  leaveName: { color: "#f1f5f9", fontSize: 13, fontWeight: "700" },
  leaveMeta: { color: "#475569", fontSize: 10, marginTop: 2 },
  leaveDates: { color: "#64748b", fontSize: 11, marginTop: 2 },
  leaveRight: {
    alignItems: "flex-end",
    gap: 5,
    minWidth: 70,
    paddingTop: 2,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: "800" },
  leaveDaysCount: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },

  holCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.15)",
    overflow: "hidden",
    gap: 14,
  },
  holDateBadge: { width: 44, alignItems: "center" },
  holDay: {
    color: "#60a5fa",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  holMon: {
    color: "#334155",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  holTitle: { color: "#f1f5f9", fontSize: 13, fontWeight: "700" },
  holType: { color: "#475569", fontSize: 10, marginTop: 2 },
  holDesc: { color: "#334155", fontSize: 10, marginTop: 2 },
  holDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(248,113,113,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  addHolCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    overflow: "hidden",
    marginBottom: 18,
  },
  addHolCardText: { color: "#60a5fa", fontSize: 14, fontWeight: "700" },

  emptyWrap: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  emptySubText: {
    color: "#1e293b",
    fontSize: 11,
    textAlign: "center",
  },
});

// ─── MODAL STYLES ─────────────────────────────────────────────────────────────
const hStyles = StyleSheet.create({
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
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { color: "#f1f5f9", fontSize: 20, fontWeight: "900" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: "#1d4ed8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
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
    marginBottom: 16,
  },
  input: { flex: 1, color: "#e2e8f0", fontSize: 13 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    overflow: "hidden",
  },
  typeBtnActive: {},
  typeBtnText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});

const rStyles = StyleSheet.create({
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
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { color: "#f1f5f9", fontSize: 20, fontWeight: "900" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  empRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  empAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(37,99,235,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  empInitials: { color: "#60a5fa", fontSize: 16, fontWeight: "900" },
  empName: { color: "#f1f5f9", fontSize: 15, fontWeight: "700" },
  empDept: { color: "#475569", fontSize: 11, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 11, fontWeight: "800" },
  detailsCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)" },
  detailLabel: { color: "#475569", fontSize: 12, fontWeight: "600" },
  detailValue: { color: "#f1f5f9", fontSize: 13, fontWeight: "700" },
  fieldLabel: {
    color: "#1d4ed8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
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
    marginBottom: 20,
  },
  input: { flex: 1, color: "#e2e8f0", fontSize: 13 },
  actionRow: { flexDirection: "row", gap: 12 },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    backgroundColor: "rgba(248,113,113,0.08)",
  },
  rejectText: { color: "#f87171", fontSize: 14, fontWeight: "800" },
  approveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 16,
    overflow: "hidden",
  },
  approveText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
