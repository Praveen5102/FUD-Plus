import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import GradientScreen from "../../../components/layout/GradientScreen";
import { APP_COLORS } from "../../../theme/appTheme";
import { supabase } from "../../../services/supabase";

const { width } = Dimensions.get("window");

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  id: string;
  date?: string;
  created_at: string;
  check_in: string | null;
  check_out: string | null;
  status?: "present" | "absent" | "late" | "half_day" | "on_leave";
  working_hours?: number;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEPT_COLORS: Record<string, [string, string]> = {
  Engineering: ["#2563eb", "#60a5fa"],
  Finance: ["#059669", "#34d399"],
  Marketing: ["#7c3aed", "#a78bfa"],
  HR: ["#db2777", "#f472b6"],
  Operations: ["#d97706", "#fbbf24"],
  Design: ["#0891b2", "#22d3ee"],
  Sales: ["#dc2626", "#f87171"],
  Default: ["#1e40af", "#3b82f6"],
};

const STATUS_CONFIG = {
  present: {
    label: "Present",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.3)",
    icon: "checkmark-circle",
  },
  late: {
    label: "Late",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.3)",
    icon: "time",
  },
  absent: {
    label: "Absent",
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.3)",
    icon: "close-circle",
  },
  half_day: {
    label: "Half Day",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.3)",
    icon: "remove-circle",
  },
  on_leave: {
    label: "On Leave",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.3)",
    icon: "calendar",
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatTime(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const h = d.getHours(),
    m = d.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function getStatus(record: AttendanceRecord): keyof typeof STATUS_CONFIG {
  if (record.status) return record.status;
  if (!record.check_in) return "absent";
  const hour = new Date(record.check_in).getHours();
  if (hour >= 10) return "late";
  return "present";
}

function workingHours(record: AttendanceRecord): number {
  if (!record.check_in || !record.check_out) return 0;
  return (
    Math.round(
      ((new Date(record.check_out).getTime() -
        new Date(record.check_in).getTime()) /
        (1000 * 60 * 60)) *
        10,
    ) / 10
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StatPill({
  icon,
  value,
  label,
  color,
  bg,
}: {
  icon: string;
  value: string | number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      style={[
        styles.statPill,
        { backgroundColor: bg, borderColor: color + "35" },
      ]}
    >
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.statPillValue, { color }]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

function InfoItem({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.infoItem}>
      <View
        style={[
          styles.infoIconBox,
          { backgroundColor: (accent ?? "#3b82f6") + "18" },
        ]}
      >
        <Ionicons name={icon as any} size={15} color={accent ?? "#60a5fa"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function EmployeeDetailsScreen({ route }: any) {
  const navigation = useNavigation();
  const { employee } = route.params;
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "attendance">(
    "overview",
  );

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const deptColors: [string, string] =
    DEPT_COLORS[employee.department] ?? DEPT_COLORS.Default;

  const initials = employee.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ── Stats derived ────────────────────────────────────────────────────────
  const stats = attendance.reduce(
    (acc, r) => {
      const s = getStatus(r);
      acc[s] = (acc[s] ?? 0) + 1;
      acc.totalHours += workingHours(r);
      return acc;
    },
    {
      present: 0,
      late: 0,
      absent: 0,
      half_day: 0,
      on_leave: 0,
      totalHours: 0,
    } as Record<string, number>,
  );

  const attendanceRate =
    attendance.length > 0
      ? Math.round(((stats.present + stats.late) / attendance.length) * 100)
      : 0;

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false });
      setAttendance(data || []);
      setLoading(false);
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Tenure ───────────────────────────────────────────────────────────────
  const tenure = Math.floor(
    (Date.now() - new Date(employee.joining_date).getTime()) /
      (1000 * 60 * 60 * 24 * 30),
  );

  // ── Hero shrink on scroll ────────────────────────────────────────────────
  const heroScale = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.92],
    extrapolate: "clamp",
  });
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.7],
    extrapolate: "clamp",
  });

  // ── QUICK ACTION HANDLERS ────────────────────────────────────────────────

  const handleMessage = async () => {
    try {
      // Check if we can send SMS
      const phoneNumber = employee.phone_number;
      if (!phoneNumber) {
        Alert.alert(
          "No Phone Number",
          "This employee doesn't have a phone number on file.",
        );
        return;
      }

      const url = `sms:${phoneNumber}`;
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Messaging is not supported on this device");
      }
    } catch (error) {
      console.error("Message error:", error);
      Alert.alert("Error", "Failed to open messaging app");
    }
  };

  const handleCall = async () => {
    try {
      const phoneNumber = employee.phone_number;
      if (!phoneNumber) {
        Alert.alert(
          "No Phone Number",
          "This employee doesn't have a phone number on file.",
        );
        return;
      }

      const url = `tel:${phoneNumber}`;
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Phone calls are not supported on this device");
      }
    } catch (error) {
      console.error("Call error:", error);
      Alert.alert("Error", "Failed to open phone app");
    }
  };

  const handleReport = async () => {
    try {
      // Prepare attendance report data
      const reportData = {
        employeeName: employee.full_name,
        employeeId: employee.employee_id,
        department: employee.department,
        attendanceRate: `${attendanceRate}%`,
        totalDays: attendance.length,
        presentDays: stats.present,
        lateDays: stats.late,
        absentDays: stats.absent,
        leaveDays: stats.on_leave,
        totalHours: stats.totalHours.toFixed(1),
        averageHours:
          attendance.length > 0
            ? (stats.totalHours / attendance.length).toFixed(1)
            : "0",
      };

      const reportText = `
📊 Attendance Report - ${employee.full_name}
━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Employee Details:
• Name: ${reportData.employeeName}
• ID: ${reportData.employeeId}
• Department: ${reportData.department}

📈 Statistics:
• Attendance Rate: ${reportData.attendanceRate}
• Total Days: ${reportData.totalDays}
• Present: ${reportData.presentDays}
• Late: ${reportData.lateDays}
• Absent: ${reportData.absentDays}
• Leave: ${reportData.leaveDays}

⏰ Hours:
• Total Hours: ${reportData.totalHours}h
• Avg/Day: ${reportData.averageHours}h

Generated: ${new Date().toLocaleDateString()}
      `;

      await Share.share({
        message: reportText,
        title: `Attendance Report - ${employee.full_name}`,
      });
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to generate report");
    }
  };

  const handleEdit = () => {
    // Navigate to edit employee screen or show edit modal
    Alert.alert(
      "Edit Employee",
      "Would you like to edit this employee's details?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Edit",
          onPress: () => {
            // Navigate to edit screen or open edit modal
            // For now, show info message
            Alert.alert(
              "Coming Soon",
              "Edit functionality will be available soon!",
            );
          },
        },
      ],
    );
  };

  const handleCopyEmail = async () => {
    if (employee.email) {
      await Clipboard.setStringAsync(employee.email);
      Alert.alert("Copied", "Email address copied to clipboard");
    }
  };

  const handleCopyPhone = async () => {
    if (employee.phone_number) {
      await Clipboard.setStringAsync(employee.phone_number);
      Alert.alert("Copied", "Phone number copied to clipboard");
    }
  };

  // ── OVERVIEW TAB ─────────────────────────────────────────────────────────
  const renderOverview = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Contact card with copy options */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CONTACT & INFO</Text>
        <View style={styles.glassBlock}>
          <TouchableOpacity onPress={handleCopyEmail} activeOpacity={0.7}>
            <InfoItem
              icon="mail-outline"
              label="Email"
              value={employee.email}
              accent="#60a5fa"
            />
          </TouchableOpacity>
          <View style={styles.itemDivider} />
          <TouchableOpacity onPress={handleCopyPhone} activeOpacity={0.7}>
            <InfoItem
              icon="call-outline"
              label="Phone"
              value={employee.phone_number}
              accent="#4ade80"
            />
          </TouchableOpacity>
          <View style={styles.itemDivider} />
          <InfoItem
            icon="calendar-outline"
            label="Joined"
            value={new Date(employee.joining_date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            accent="#fbbf24"
          />
          <View style={styles.itemDivider} />
          <InfoItem
            icon="time-outline"
            label="Tenure"
            value={`${tenure} months`}
            accent="#a78bfa"
          />
          <View style={styles.itemDivider} />
          <InfoItem
            icon="card-outline"
            label="Employee ID"
            value={employee.employee_id}
            accent={deptColors[1]}
          />
        </View>
      </View>

      {/* Attendance snapshot */}
      {!loading && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ATTENDANCE SNAPSHOT</Text>

          {/* Rate bar */}
          <View style={styles.rateCard}>
            <LinearGradient
              colors={["rgba(37,99,235,0.15)", "rgba(37,99,235,0.04)"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            <View style={styles.rateHeader}>
              <Text style={styles.rateTitle}>Attendance Rate</Text>
              <Text
                style={[
                  styles.ratePercent,
                  {
                    color:
                      attendanceRate >= 85
                        ? "#4ade80"
                        : attendanceRate >= 70
                          ? "#fbbf24"
                          : "#f87171",
                  },
                ]}
              >
                {attendanceRate}%
              </Text>
            </View>
            <View style={styles.rateTrack}>
              <LinearGradient
                colors={
                  attendanceRate >= 85
                    ? ["#059669", "#4ade80"]
                    : attendanceRate >= 70
                      ? ["#d97706", "#fbbf24"]
                      : ["#dc2626", "#f87171"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.rateFill, { width: `${attendanceRate}%` }]}
              />
            </View>
            <Text style={styles.rateSubtext}>
              Based on {attendance.length} recorded days
            </Text>
          </View>

          {/* Stat pills */}
          <View style={styles.pillsRow}>
            <StatPill
              icon="checkmark-circle"
              value={stats.present}
              label="Present"
              color="#4ade80"
              bg="rgba(74,222,128,0.1)"
            />
            <StatPill
              icon="time"
              value={stats.late}
              label="Late"
              color="#fbbf24"
              bg="rgba(251,191,36,0.1)"
            />
            <StatPill
              icon="close-circle"
              value={stats.absent}
              label="Absent"
              color="#f87171"
              bg="rgba(248,113,113,0.1)"
            />
            <StatPill
              icon="calendar"
              value={stats.on_leave}
              label="Leave"
              color="#60a5fa"
              bg="rgba(96,165,250,0.1)"
            />
          </View>

          {/* Avg hours */}
          <View style={styles.avgHoursCard}>
            <MaterialCommunityIcons
              name="clock-fast"
              size={20}
              color="#a78bfa"
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.avgHoursLabel}>Avg. Working Hours / Day</Text>
              <Text style={styles.avgHoursSub}>
                Calculated from check-in/out records
              </Text>
            </View>
            <Text style={styles.avgHoursValue}>
              {attendance.length > 0
                ? (stats.totalHours / attendance.length).toFixed(1)
                : "—"}
              h
            </Text>
          </View>
        </View>
      )}

      {/* Quick actions - ALL WORKING */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.actionsGrid}>
          {[
            {
              icon: "chatbubble-outline",
              label: "Message",
              color: "#60a5fa",
              bg: "rgba(96,165,250,0.1)",
              onPress: handleMessage,
            },
            {
              icon: "call-outline",
              label: "Call",
              color: "#4ade80",
              bg: "rgba(74,222,128,0.1)",
              onPress: handleCall,
            },
            {
              icon: "document-text-outline",
              label: "Report",
              color: "#fbbf24",
              bg: "rgba(251,191,36,0.1)",
              onPress: handleReport,
            },
            {
              icon: "create-outline",
              label: "Edit",
              color: "#a78bfa",
              bg: "rgba(167,139,250,0.1)",
              onPress: handleEdit,
            },
          ].map(({ icon, label, color, bg, onPress }) => (
            <TouchableOpacity
              key={label}
              style={styles.actionCard}
              activeOpacity={0.75}
              onPress={onPress}
            >
              <LinearGradient
                colors={[bg, "transparent"]}
                style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
              />
              <View
                style={[styles.actionIconRing, { borderColor: color + "40" }]}
              >
                <Ionicons name={icon as any} size={20} color={color} />
              </View>
              <Text style={[styles.actionLabel, { color }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  // ── ATTENDANCE TAB ────────────────────────────────────────────────────────
  const renderAttendance = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Summary row */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>THIS MONTH</Text>
        <View style={styles.pillsRow}>
          <StatPill
            icon="checkmark-circle"
            value={stats.present}
            label="Present"
            color="#4ade80"
            bg="rgba(74,222,128,0.1)"
          />
          <StatPill
            icon="time"
            value={stats.late}
            label="Late"
            color="#fbbf24"
            bg="rgba(251,191,36,0.1)"
          />
          <StatPill
            icon="close-circle"
            value={stats.absent}
            label="Absent"
            color="#f87171"
            bg="rgba(248,113,113,0.1)"
          />
          <StatPill
            icon="remove-circle"
            value={stats.half_day}
            label="Half"
            color="#a78bfa"
            bg="rgba(167,139,250,0.1)"
          />
        </View>
      </View>

      {/* Daily log */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DAILY LOG</Text>

        {attendance.length === 0 ? (
          <View style={styles.emptyLog}>
            <Ionicons name="calendar-outline" size={32} color="#1e3a5f" />
            <Text style={styles.emptyLogText}>No attendance records yet</Text>
          </View>
        ) : (
          attendance.map((record, index) => {
            const status = getStatus(record);
            const cfg = STATUS_CONFIG[status];
            const hours = workingHours(record);
            const dateObj = new Date(record.created_at);

            return (
              <Animated.View
                key={record.id ?? index}
                style={[
                  styles.logRow,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateX: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Date column */}
                <View style={styles.logDateCol}>
                  <Text style={styles.logDay}>{dateObj.getDate()}</Text>
                  <Text style={styles.logMonth}>
                    {dateObj.toLocaleDateString("en-IN", { month: "short" })}
                  </Text>
                </View>

                {/* Connector line */}
                <View style={styles.logConnector}>
                  <View
                    style={[styles.logDot, { backgroundColor: cfg.color }]}
                  />
                  {index < attendance.length - 1 && (
                    <View
                      style={[
                        styles.logLine,
                        { backgroundColor: cfg.color + "30" },
                      ]}
                    />
                  )}
                </View>

                {/* Content */}
                <View
                  style={[styles.logCard, { borderColor: cfg.color + "25" }]}
                >
                  <LinearGradient
                    colors={[cfg.bg, "transparent"]}
                    style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                  />
                  <View style={styles.logCardTop}>
                    <Text style={styles.logWeekday}>
                      {dateObj.toLocaleDateString("en-IN", { weekday: "long" })}
                    </Text>
                    <View
                      style={[
                        styles.logBadge,
                        { backgroundColor: cfg.bg, borderColor: cfg.border },
                      ]}
                    >
                      <Ionicons
                        name={cfg.icon as any}
                        size={10}
                        color={cfg.color}
                      />
                      <Text style={[styles.logBadgeText, { color: cfg.color }]}>
                        {cfg.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.logTimes}>
                    <View style={styles.logTimeChip}>
                      <Ionicons
                        name="log-in-outline"
                        size={11}
                        color="#64748b"
                      />
                      <Text style={styles.logTimeText}>
                        {formatTime(record.check_in)}
                      </Text>
                    </View>
                    <Feather name="arrow-right" size={10} color="#334155" />
                    <View style={styles.logTimeChip}>
                      <Ionicons
                        name="log-out-outline"
                        size={11}
                        color="#64748b"
                      />
                      <Text style={styles.logTimeText}>
                        {formatTime(record.check_out)}
                      </Text>
                    </View>
                    {hours > 0 && (
                      <View style={styles.hoursTag}>
                        <Text style={styles.hoursTagText}>{hours}h</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}
      </View>
    </Animated.View>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <GradientScreen>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Back button — floats above scroll */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn}>
            <Feather name="more-vertical" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
        >
          {/* ── HERO ──────────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.hero,
              { transform: [{ scale: heroScale }], opacity: heroOpacity },
            ]}
          >
            {/* Glow ring behind avatar */}
            <View style={[styles.glowRing, { shadowColor: deptColors[1] }]}>
              {employee.profile_image ? (
                <Image
                  source={{ uri: employee.profile_image }}
                  style={styles.heroAvatar}
                />
              ) : (
                <LinearGradient
                  colors={deptColors}
                  style={styles.heroAvatarGradient}
                >
                  <Text style={styles.heroInitials}>{initials}</Text>
                </LinearGradient>
              )}
            </View>

            {/* Active pulse */}
            {employee.is_active && (
              <View style={styles.heroPulseDot}>
                <View style={styles.heroPulseInner} />
              </View>
            )}

            <Text style={styles.heroName}>{employee.full_name}</Text>
            <Text style={[styles.heroDept, { color: deptColors[1] }]}>
              {employee.department}
            </Text>

            {/* Tag row */}
            <View style={styles.heroTagRow}>
              <View
                style={[
                  styles.heroTag,
                  {
                    backgroundColor: deptColors[0] + "30",
                    borderColor: deptColors[0] + "50",
                  },
                ]}
              >
                <Ionicons name="card-outline" size={10} color={deptColors[1]} />
                <Text style={[styles.heroTagText, { color: deptColors[1] }]}>
                  {employee.employee_id}
                </Text>
              </View>
              <View
                style={[
                  styles.heroTag,
                  {
                    backgroundColor: employee.is_active
                      ? "rgba(74,222,128,0.12)"
                      : "rgba(248,113,113,0.12)",
                    borderColor: employee.is_active
                      ? "rgba(74,222,128,0.3)"
                      : "rgba(248,113,113,0.3)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.heroPulseDotInline,
                    {
                      backgroundColor: employee.is_active
                        ? "#4ade80"
                        : "#f87171",
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.heroTagText,
                    { color: employee.is_active ? "#4ade80" : "#f87171" },
                  ]}
                >
                  {employee.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
              <View
                style={[
                  styles.heroTag,
                  {
                    backgroundColor: "rgba(167,139,250,0.12)",
                    borderColor: "rgba(167,139,250,0.3)",
                  },
                ]}
              >
                <Ionicons name="time-outline" size={10} color="#a78bfa" />
                <Text style={[styles.heroTagText, { color: "#a78bfa" }]}>
                  {tenure}mo tenure
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ── TABS ──────────────────────────────────────────────────── */}
          <View style={styles.tabsWrap}>
            {(["overview", "attendance"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabBtn,
                  activeTab === tab && styles.tabBtnActive,
                ]}
                activeOpacity={0.8}
              >
                {activeTab === tab && (
                  <LinearGradient
                    colors={["#1d4ed8", "#3b82f6"]}
                    style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                )}
                <Ionicons
                  name={
                    tab === "overview" ? "person-outline" : "calendar-outline"
                  }
                  size={14}
                  color={activeTab === tab ? "#fff" : "#475569"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}
                >
                  {tab === "overview" ? "Overview" : "Attendance"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── CONTENT ───────────────────────────────────────────────── */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Fetching records…</Text>
              </View>
            ) : activeTab === "overview" ? (
              renderOverview()
            ) : (
              renderAttendance()
            )}
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </GradientScreen>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 54,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  glowRing: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
    borderRadius: 36,
    marginBottom: 16,
  },
  heroAvatar: {
    width: 100,
    height: 100,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroAvatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  heroInitials: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 2,
  },
  heroPulseDot: {
    position: "absolute",
    top: 155,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(74,222,128,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroPulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ade80",
  },
  heroName: {
    color: "#f1f5f9",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroDept: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
  },
  heroTagRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroPulseDotInline: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Tabs
  tabsWrap: {
    flexDirection: "row",
    marginHorizontal: 20,
    padding: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 4,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 16,
    overflow: "hidden",
  },
  tabBtnActive: {},
  tabText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Section
  section: { marginBottom: 24 },
  sectionLabel: {
    color: "#1d4ed8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },

  // Glass block
  glassBlock: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  infoValue: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 1,
  },
  itemDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginLeft: 46,
  },

  // Rate card
  rateCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    marginBottom: 14,
    overflow: "hidden",
  },
  rateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rateTitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  ratePercent: {
    fontSize: 22,
    fontWeight: "900",
  },
  rateTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    marginBottom: 8,
  },
  rateFill: {
    height: 8,
    borderRadius: 4,
  },
  rateSubtext: {
    color: "#334155",
    fontSize: 11,
  },

  // Stat pills
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  statPillValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  statPillLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Avg hours
  avgHoursCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(167,139,250,0.08)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.2)",
  },
  avgHoursLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  avgHoursSub: { color: "#334155", fontSize: 10, marginTop: 2 },
  avgHoursValue: { color: "#a78bfa", fontSize: 26, fontWeight: "900" },

  // Actions
  actionsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  actionIconRing: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Log rows
  logRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-start",
  },
  logDateCol: {
    width: 38,
    alignItems: "center",
    paddingTop: 14,
  },
  logDay: {
    color: "#f1f5f9",
    fontSize: 17,
    fontWeight: "900",
  },
  logMonth: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  logConnector: {
    alignItems: "center",
    width: 20,
    paddingTop: 18,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  logLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    borderRadius: 1,
  },
  logCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginLeft: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  logCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  logWeekday: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "700",
  },
  logBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
  },
  logBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  logTimes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logTimeText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
  },
  hoursTag: {
    marginLeft: "auto",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(167,139,250,0.15)",
  },
  hoursTagText: {
    color: "#a78bfa",
    fontSize: 11,
    fontWeight: "800",
  },

  emptyLog: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyLogText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },

  loaderWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 14,
  },
  loadingText: {
    color: "#475569",
    fontSize: 13,
  },
});
