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
  Image,
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
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as XLSX from "xlsx";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import GradientScreen from "../../../components/layout/GradientScreen";
import { APP_COLORS } from "../../../theme/appTheme";
import { supabase } from "../../../services/supabase";
import NotificationBell from "../../../components/notifications/NotificationBell";

const { width, height } = Dimensions.get("window");

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface EmployeeProfile {
  id: string;
  full_name: string;
  department: string;
  employee_id: string;
  profile_image: string | null;
}

interface ProfileSnippet {
  full_name: string;
  department: string;
  employee_id: string;
  profile_image: string | null;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  check_in: string | null;
  check_out: string | null;
  check_in_selfie: string | null;
  check_out_selfie: string | null;
  work_status: string | null;
  total_work_hours: number | null;
  attendance_date: string;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
}

type TabKey = "all" | "present" | "absent" | "late";

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  Present: {
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.35)",
    label: "Present",
  },
  Late: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.35)",
    label: "Late",
  },
  "Half Day": {
    color: "#fb923c",
    bg: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.35)",
    label: "Half Day",
  },
  Absent: {
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.35)",
    label: "Absent",
  },
  Working: {
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.35)",
    label: "Working",
  },
};
const DEFAULT_STATUS = STATUS_CONFIG.Absent;

function getStatusCfg(status: string | null | undefined) {
  return STATUS_CONFIG[status ?? ""] ?? DEFAULT_STATUS;
}

function resolveProfile(
  profiles: ProfileSnippet | ProfileSnippet[] | null,
): ProfileSnippet | null {
  if (!profiles) return null;
  if (Array.isArray(profiles)) return profiles[0] ?? null;
  return profiles;
}

function fmtTime(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── EMPLOYEE ACTIVITY CARD ───────────────────────────────────────────────────
const ActivityCard = React.memo(
  ({
    record,
    isPresent,
    index,
    onPress,
    anonymized = false,
    displayName,
    displayDept,
    displayEmpId,
    displayProfileImage,
  }: {
    record?: AttendanceRecord;
    employee?: EmployeeProfile;
    isPresent: boolean;
    index: number;
    name: string;
    dept: string;
    empId: string;
    profileImage: string | null;
    onPress: () => void;
    anonymized?: boolean;
    displayName: string;
    displayDept: string;
    displayEmpId: string;
    displayProfileImage: string | null;
  }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const selfieUrl = !anonymized ? (record?.check_in_selfie ?? null) : null;
    const status = record?.work_status ?? (isPresent ? "Working" : "Absent");
    const cfg = getStatusCfg(status);

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={[styles.actCard, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.actCardInteractable}
          onPress={onPress}
          activeOpacity={0.7}
          disabled={anonymized}
        >
          <LinearGradient
            colors={[cfg.bg, "transparent"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
          />

          <View style={styles.actAvatarWrap}>
            {anonymized ? (
              <LinearGradient
                colors={["rgba(248,113,113,0.25)", "rgba(248,113,113,0.1)"]}
                style={styles.actAvatarFallback}
              >
                <Text
                  style={[
                    styles.actInitials,
                    { color: "#f87171", fontSize: 28 },
                  ]}
                >
                  ?
                </Text>
              </LinearGradient>
            ) : selfieUrl ? (
              <Image source={{ uri: selfieUrl }} style={styles.actSelfie} />
            ) : (
              <LinearGradient
                colors={["rgba(37,99,235,0.4)", "rgba(37,99,235,0.15)"]}
                style={styles.actAvatarFallback}
              >
                <Text style={styles.actInitials}>
                  {(displayName !== "?" ? displayName : "??")
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            {!anonymized && status === "Working" && (
              <View style={styles.actLiveDot} />
            )}
          </View>

          <View style={styles.actInfo}>
            <Text style={styles.actName} numberOfLines={1}>
              {displayName === "?" ? "???" : displayName}
            </Text>
            <Text style={styles.actDept}>
              {displayDept === "?" ? "———" : displayDept}
            </Text>
            <Text style={styles.actId}>
              {displayEmpId === "?" ? "———" : displayEmpId}
            </Text>

            {!anonymized && isPresent && record?.check_in && (
              <View style={styles.actTimesRow}>
                <View style={styles.actTimeChip}>
                  <Ionicons name="log-in-outline" size={10} color="#64748b" />
                  <Text style={styles.actTimeText}>
                    {fmtTime(record.check_in)}
                  </Text>
                </View>
                {record.check_out && (
                  <>
                    <Feather name="arrow-right" size={9} color="#334155" />
                    <View style={styles.actTimeChip}>
                      <Ionicons
                        name="log-out-outline"
                        size={10}
                        color="#64748b"
                      />
                      <Text style={styles.actTimeText}>
                        {fmtTime(record.check_out)}
                      </Text>
                    </View>
                  </>
                )}
                {record.total_work_hours != null && (
                  <View style={styles.actHoursTag}>
                    <Text style={styles.actHoursText}>
                      {record.total_work_hours.toFixed(1)}h
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View
            style={[
              styles.actStatusBadge,
              { backgroundColor: cfg.bg, borderColor: cfg.border },
            ]}
          >
            <Text style={[styles.actStatusText, { color: cfg.color }]}>
              {anonymized ? "Absent" : cfg.label}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  },
);

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = React.memo(
  ({
    value,
    label,
    color,
    icon,
    active,
    onPress,
    index,
  }: {
    value: string | number;
    label: string;
    color: string;
    icon: string;
    active: boolean;
    onPress: () => void;
    index: number;
  }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 90,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={{
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
          width: "48%",
        }}
      >
        <TouchableOpacity
          style={[
            styles.statCard,
            active && {
              borderColor: color + "60",
              backgroundColor: color + "0f",
            },
          ]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          {active && (
            <LinearGradient
              colors={[color + "20", "transparent"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
            />
          )}
          <View
            style={[styles.statIconWrap, { backgroundColor: color + "18" }]}
          >
            <Ionicons name={icon as any} size={20} color={color} />
          </View>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  },
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function AdminHomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  // Modal Detailed View State
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null,
  );
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeProfile | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // TODO: wire to real unread count from your notifications system
  const unreadNotifCount = 0;

  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fetchingRef = useRef(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async (silent = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (!silent) setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const [empRes, attnRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, department, employee_id, profile_image")
          .eq("role", "employee")
          .order("full_name"),
        supabase
          .from("attendance")
          .select(
            `
            id,
            employee_id,
            check_in,
            check_out,
            check_in_selfie,
            check_out_selfie,
            work_status,
            total_work_hours,
            attendance_date,
            profiles (
              full_name,
              department,
              employee_id,
              profile_image
            )
          `,
          )
          .eq("attendance_date", today)
          .order("check_in", { ascending: false }),
      ]);

      if (empRes.error) console.error("employees fetch:", empRes.error);
      if (attnRes.error) console.error("attendance fetch:", attnRes.error);

      setEmployees(empRes.data ?? []);

      const normalised: AttendanceRecord[] = (attnRes.data ?? []).map(
        (row: any) => ({
          ...row,
          profiles: Array.isArray(row.profiles)
            ? (row.profiles[0] ?? null)
            : (row.profiles ?? null),
        }),
      );
      setAttendance(normalised);
    } catch (e) {
      console.error("fetchDashboard:", e);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    const today = new Date().toISOString().split("T")[0];
    realtimeRef.current = supabase
      .channel(`admin-dashboard-${today}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `attendance_date=eq.${today}`,
        },
        () => {
          fetchDashboard(true);
        },
      )
      .subscribe();

    return () => {
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    };
  }, [fetchDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const presentIds = useMemo(
    () => new Set(attendance.map((a) => a.employee_id)),
    [attendance],
  );

  const stats = useMemo(() => {
    const present = attendance.filter((a) => !!a.check_in).length;
    const late = attendance.filter(
      (a) =>
        a.work_status === "Late" ||
        (a.work_status === "Working" &&
          a.check_in &&
          new Date(a.check_in).getHours() >= 11),
    ).length;
    const absent = employees.length - present;
    const rate =
      employees.length > 0 ? Math.round((present / employees.length) * 100) : 0;
    return { present, late, absent, rate };
  }, [attendance, employees]);

  const attnByEmpId = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    attendance.forEach((a) => {
      map[a.employee_id] = a;
    });
    return map;
  }, [attendance]);

  const filteredList = useMemo(() => {
    switch (activeTab) {
      case "present":
        return employees.filter(
          (e) =>
            presentIds.has(e.id) && attnByEmpId[e.id]?.work_status !== "Late",
        );
      case "absent":
        return employees.filter((e) => !presentIds.has(e.id));
      case "late":
        return employees.filter(
          (e) =>
            attnByEmpId[e.id]?.work_status === "Late" ||
            attnByEmpId[e.id]?.work_status === "Working",
        );
      default:
        return employees;
    }
  }, [activeTab, employees, presentIds, attnByEmpId]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCardPress = (emp: EmployeeProfile, rec?: AttendanceRecord) => {
    setSelectedEmployee(emp);
    setSelectedRecord(rec || null);
    setDetailsVisible(true);
  };

  const exportAttendance = async () => {
    try {
      const today = new Date().toLocaleDateString("en-IN");
      const rows = employees.map((emp) => {
        const rec = attnByEmpId[emp.id];
        return {
          "Employee Name": emp.full_name,
          "Employee ID": emp.employee_id,
          Department: emp.department,
          "Check-In": fmtTime(rec?.check_in ?? null),
          "Check-Out": fmtTime(rec?.check_out ?? null),
          "Work Hours":
            rec?.total_work_hours != null
              ? `${rec.total_work_hours.toFixed(1)}h`
              : "—",
          Status: rec?.work_status ?? "Absent",
          Date: today,
        };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(rows),
        "Today Attendance",
      );
      const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const uri =
        (FileSystem.documentDirectory ?? "") +
        `attendance_${new Date().toISOString().split("T")[0]}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.error("export:", e);
    }
  };

  // ── Render Arrays ────────────────────────────────────────────────────────
  const TABS: { key: TabKey; label: string; count: number; color: string }[] = [
    { key: "all", label: "All", count: employees.length, color: "#60a5fa" },
    {
      key: "present",
      label: "Present",
      count: stats.present,
      color: "#4ade80",
    },
    { key: "absent", label: "Absent", count: stats.absent, color: "#f87171" },
    { key: "late", label: "Late", count: stats.late, color: "#fbbf24" },
  ];

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Derived detail visual configurations
  const modalStatus =
    selectedRecord?.work_status ??
    (selectedEmployee && presentIds.has(selectedEmployee.id)
      ? "Working"
      : "Absent");
  const modalCfg = getStatusCfg(modalStatus);

  return (
    <GradientScreen>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>ADMIN DASHBOARD</Text>
            <Text style={styles.headerTitle}>Overview</Text>
            <Text style={styles.headerDate}>{todayStr}</Text>
          </View>
          {/* Notification bell replaces the old export button in the header */}
          <NotificationBell unreadCount={unreadNotifCount} />
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loaderText}>Loading dashboard…</Text>
          </View>
        ) : (
          <>
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
              {/* ── STAT CARDS ──────────────────────────────────────── */}
              <View style={styles.statsGrid}>
                <StatCard
                  value={employees.length}
                  label="Total"
                  color="#60a5fa"
                  icon="people-outline"
                  active={activeTab === "all"}
                  onPress={() => setActiveTab("all")}
                  index={0}
                />
                <StatCard
                  value={stats.present}
                  label="Present"
                  color="#4ade80"
                  icon="checkmark-circle"
                  active={activeTab === "present"}
                  onPress={() => setActiveTab("present")}
                  index={1}
                />
                <StatCard
                  value={stats.absent}
                  label="Absent"
                  color="#f87171"
                  icon="close-circle-outline"
                  active={activeTab === "absent"}
                  onPress={() => setActiveTab("absent")}
                  index={2}
                />
                <StatCard
                  value={`${stats.rate}%`}
                  label="Rate"
                  color="#a78bfa"
                  icon="trending-up"
                  active={false}
                  onPress={() => {}}
                  index={3}
                />
              </View>

              {/* ── RATE BAR ────────────────────────────────────────── */}
              <View style={styles.rateCard}>
                <LinearGradient
                  colors={["rgba(37,99,235,0.15)", "rgba(37,99,235,0.04)"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                />
                <View style={styles.rateRow}>
                  <Text style={styles.rateLabel}>Today's Attendance Rate</Text>
                  <Text
                    style={[
                      styles.rateValue,
                      {
                        color:
                          stats.rate >= 85
                            ? "#4ade80"
                            : stats.rate >= 70
                              ? "#fbbf24"
                              : "#f87171",
                      },
                    ]}
                  >
                    {stats.rate}%
                  </Text>
                </View>
                <View style={styles.rateTrack}>
                  <LinearGradient
                    colors={
                      stats.rate >= 85
                        ? ["#059669", "#4ade80"]
                        : stats.rate >= 70
                          ? ["#d97706", "#fbbf24"]
                          : ["#dc2626", "#f87171"]
                    }
                    style={[styles.rateFill, { width: `${stats.rate}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
                <Text style={styles.rateSubtext}>
                  {stats.present} present · {stats.late} late · {stats.absent}{" "}
                  absent
                </Text>
              </View>

              {/* ── TAB PILLS ───────────────────────────────────────── */}
              <View style={styles.tabRow}>
                {TABS.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.tabPill,
                      activeTab === t.key && { borderColor: t.color + "50" },
                    ]}
                    onPress={() => setActiveTab(t.key)}
                    activeOpacity={0.8}
                  >
                    {activeTab === t.key && (
                      <LinearGradient
                        colors={[t.color + "25", t.color + "0a"]}
                        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                      />
                    )}
                    <Text
                      style={[
                        styles.tabPillText,
                        activeTab === t.key && { color: t.color },
                      ]}
                    >
                      {t.label}
                    </Text>
                    <View
                      style={[
                        styles.tabPillCount,
                        { backgroundColor: t.color + "20" },
                      ]}
                    >
                      <Text
                        style={[styles.tabPillCountText, { color: t.color }]}
                      >
                        {t.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── SECTION TITLE ───────────────────────────────────── */}
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>
                  {activeTab === "all"
                    ? "All Employees"
                    : activeTab === "present"
                      ? "Present Today"
                      : activeTab === "absent"
                        ? "Absent Today"
                        : "Late Today"}
                </Text>
                <View style={styles.realtimeBadge}>
                  <View style={styles.realtimeDot} />
                  <Text style={styles.realtimeText}>Live</Text>
                </View>
              </View>

              {/* ── EMPLOYEE LIST ── */}
              {filteredList.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="people-outline" size={40} color="#1e3a5f" />
                  <Text style={styles.emptyText}>
                    No employees in this category
                  </Text>
                </View>
              ) : (
                filteredList.map((emp, index) => {
                  const rec = attnByEmpId[emp.id];
                  const isPresent = presentIds.has(emp.id);
                  const shouldAnonymize = false;

                  const displayName = emp.full_name;
                  const displayDept = emp.department;
                  const displayEmpId = emp.employee_id;
                  const displayProfileImage = emp.profile_image;

                  return (
                    <ActivityCard
                      key={emp.id}
                      record={
                        rec
                          ? {
                              ...rec,
                              profiles: {
                                full_name: emp.full_name,
                                department: emp.department,
                                employee_id: emp.employee_id,
                                profile_image: emp.profile_image,
                              },
                            }
                          : undefined
                      }
                      employee={emp}
                      isPresent={isPresent}
                      index={index}
                      name={displayName}
                      dept={displayDept}
                      empId={displayEmpId}
                      profileImage={displayProfileImage}
                      onPress={() => handleCardPress(emp, rec)}
                      anonymized={shouldAnonymize}
                      displayName={displayName}
                      displayDept={displayDept}
                      displayEmpId={displayEmpId}
                      displayProfileImage={displayProfileImage}
                    />
                  );
                })
              )}
            </ScrollView>

            {/* ── EXPORT BUTTON — FIXED BOTTOM BAR ─────────────────── */}
            <View style={styles.exportBarWrapper}>
              <TouchableOpacity
                style={styles.exportBarBtn}
                onPress={exportAttendance}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#1d4ed8", "#3b82f6"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <Feather name="download" size={17} color="#fff" />
                <Text style={styles.exportBarText}>Export Attendance</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── DETAILED ATTENDANCE MODAL (BOTTOM SHEET STYLE) ──────── */}
        <Modal
          visible={detailsVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setDetailsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalDismissArea}
              activeOpacity={1}
              onPress={() => setDetailsVisible(false)}
            />

            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeaderTitle}>Employee Details</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setDetailsVisible(false)}
                >
                  <Ionicons name="close" size={22} color="#f1f5f9" />
                </TouchableOpacity>
              </View>

              {selectedEmployee && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScrollBody}
                >
                  <View style={styles.detailTargetCard}>
                    <View style={styles.detailAvatarWrap}>
                      {selectedEmployee.profile_image ? (
                        <Image
                          source={{ uri: selectedEmployee.profile_image }}
                          style={styles.detailProfileImg}
                        />
                      ) : (
                        <View style={styles.detailAvatarFallback}>
                          <Text style={styles.detailInitials}>
                            {selectedEmployee.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailFullName}>
                        {selectedEmployee.full_name}
                      </Text>
                      <Text style={styles.detailDeptText}>
                        {selectedEmployee.department}
                      </Text>
                      <Text style={styles.detailEmpIdText}>
                        ID: {selectedEmployee.employee_id}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.detailBadge,
                        {
                          backgroundColor: modalCfg.bg,
                          borderColor: modalCfg.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailBadgeText,
                          { color: modalCfg.color },
                        ]}
                      >
                        {modalCfg.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.detailsSectionHeading}>
                    Activity Logs
                  </Text>

                  <View style={styles.timelineContainer}>
                    <View style={styles.timelineItem}>
                      <View
                        style={[
                          styles.timelineIconTrack,
                          {
                            backgroundColor: selectedRecord?.check_in
                              ? "rgba(74,222,128,0.15)"
                              : "rgba(255,255,255,0.05)",
                          },
                        ]}
                      >
                        <Ionicons
                          name="log-in"
                          size={18}
                          color={
                            selectedRecord?.check_in ? "#4ade80" : "#475569"
                          }
                        />
                      </View>
                      <View style={styles.timelineContentBox}>
                        <Text style={styles.timelineLabel}>
                          Check-In Punch Time
                        </Text>
                        <Text style={styles.timelineValue}>
                          {selectedRecord?.check_in
                            ? fmtTime(selectedRecord.check_in)
                            : "—"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timelineItem}>
                      <View
                        style={[
                          styles.timelineIconTrack,
                          {
                            backgroundColor: selectedRecord?.check_out
                              ? "rgba(96,165,250,0.15)"
                              : "rgba(255,255,255,0.05)",
                          },
                        ]}
                      >
                        <Ionicons
                          name="log-out"
                          size={18}
                          color={
                            selectedRecord?.check_out ? "#60a5fa" : "#475569"
                          }
                        />
                      </View>
                      <View style={styles.timelineContentBox}>
                        <Text style={styles.timelineLabel}>
                          Check-Out Punch Time
                        </Text>
                        <Text style={styles.timelineValue}>
                          {selectedRecord?.check_out
                            ? fmtTime(selectedRecord.check_out)
                            : "Not clocked out yet"}
                        </Text>
                      </View>
                    </View>

                    {selectedRecord?.total_work_hours != null && (
                      <View style={styles.timelineItem}>
                        <View
                          style={[
                            styles.timelineIconTrack,
                            { backgroundColor: "rgba(167,139,250,0.15)" },
                          ]}
                        >
                          <Ionicons name="time" size={18} color="#a78bfa" />
                        </View>
                        <View style={styles.timelineContentBox}>
                          <Text style={styles.timelineLabel}>
                            Total Logged Session Duration
                          </Text>
                          <Text
                            style={[styles.timelineValue, { color: "#a78bfa" }]}
                          >
                            {selectedRecord.total_work_hours.toFixed(2)} Hours
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <Text style={styles.detailsSectionHeading}>
                    Verification Selfies
                  </Text>

                  <View style={styles.selfiesContainer}>
                    <View style={styles.selfieFrame}>
                      <Text style={styles.selfieFrameTitle}>
                        Check-In Capture
                      </Text>
                      {selectedRecord?.check_in_selfie ? (
                        <Image
                          source={{ uri: selectedRecord.check_in_selfie }}
                          style={styles.expandedSelfieGraphic}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.emptySelfiePlaceholder}>
                          <Feather
                            name="camera-off"
                            size={24}
                            color="#334155"
                          />
                          <Text style={styles.emptySelfieText}>
                            No check-in selfie
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.selfieFrame}>
                      <Text style={styles.selfieFrameTitle}>
                        Check-Out Capture
                      </Text>
                      {selectedRecord?.check_out_selfie ? (
                        <Image
                          source={{ uri: selectedRecord.check_out_selfie }}
                          style={styles.expandedSelfieGraphic}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.emptySelfiePlaceholder}>
                          <Feather
                            name="camera-off"
                            size={24}
                            color="#334155"
                          />
                          <Text style={styles.emptySelfieText}>
                            No check-out selfie
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GradientScreen>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingBottom: 110 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerEyebrow: {
    color: "#1d4ed8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  headerTitle: {
    color: "#f1f5f9",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerDate: { color: "#475569", fontSize: 12, marginTop: 3 },

  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loaderText: { color: "#475569", fontSize: 13 },

  // Stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: { fontSize: 28, fontWeight: "900" },
  statLabel: {
    color: "#475569",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },

  // Rate bar
  rateCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rateLabel: { color: "#64748b", fontSize: 13 },
  rateValue: { fontSize: 22, fontWeight: "900" },
  rateTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    marginBottom: 8,
  },
  rateFill: { height: 8, borderRadius: 4 },
  rateSubtext: { color: "#334155", fontSize: 11 },

  // Tabs
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  tabPillText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  tabPillCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  tabPillCountText: { fontSize: 11, fontWeight: "800" },

  // Section
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { color: "#f1f5f9", fontSize: 17, fontWeight: "800" },
  realtimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
  },
  realtimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  realtimeText: { color: "#4ade80", fontSize: 10, fontWeight: "800" },

  // Activity card
  actCard: {
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  actCardInteractable: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    width: "100%",
  },
  actAvatarWrap: { position: "relative", marginRight: 14 },
  actSelfie: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },
  actAvatarFallback: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "rgba(37,99,235,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  actInitials: { color: "#93c5fd", fontSize: 18, fontWeight: "900" },
  actLiveDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4ade80",
    borderWidth: 2,
    borderColor: "#020617",
  },
  actInfo: { flex: 1 },
  actName: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  actDept: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  actId: { color: "#334155", fontSize: 10, marginBottom: 6 },
  actTimesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  actTimeChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  actTimeText: { color: "#64748b", fontSize: 11, fontWeight: "500" },
  actHoursTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(167,139,250,0.15)",
  },
  actHoursText: { color: "#a78bfa", fontSize: 10, fontWeight: "800" },
  actStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  actStatusText: { fontSize: 10, fontWeight: "800" },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#334155", fontSize: 13, fontWeight: "600" },

  // Export bottom bar
  exportBarWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(2,6,23,0.6)",
  },
  exportBarBtn: {
    height: 52,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  exportBarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  // Modal BottomSheet Specifications
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.85)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: height * 0.85,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalHandle: {
    width: 42,
    height: 5,
    backgroundColor: "#334155",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  modalHeaderTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "800",
  },
  modalCloseBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 6,
    borderRadius: 12,
  },
  modalScrollBody: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  detailTargetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 24,
  },
  detailAvatarWrap: {
    marginRight: 16,
  },
  detailProfileImg: {
    width: 64,
    height: 64,
    borderRadius: 20,
  },
  detailAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  detailInitials: {
    color: "#38bdf8",
    fontSize: 20,
    fontWeight: "800",
  },
  detailFullName: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  detailDeptText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  detailEmpIdText: {
    color: "#64748b",
    fontSize: 11,
  },
  detailBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  detailsSectionHeading: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  timelineContainer: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    marginBottom: 24,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  timelineIconTrack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  timelineContentBox: {
    flex: 1,
  },
  timelineLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  timelineValue: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "700",
  },
  selfiesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  selfieFrame: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
  },
  selfieFrameTitle: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
  },
  expandedSelfieGraphic: {
    width: "100%",
    height: 150,
    borderRadius: 14,
    backgroundColor: "#020617",
  },
  emptySelfiePlaceholder: {
    width: "100%",
    height: 150,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.01)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  emptySelfieText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
});
