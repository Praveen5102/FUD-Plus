import React, { useEffect, useRef, useState } from "react";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as XLSX from "xlsx";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import GradientScreen from "../../../components/layout/GradientScreen";
import { APP_COLORS } from "../../../theme/appTheme";
import { supabase } from "../../../services/supabase";

const { width } = Dimensions.get("window");

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface WeeklyItem {
  day: string;
  present: number;
  total: number;
  date: string;
}
interface DeptItem {
  name: string;
  present: number;
  absent: number;
  late: number;
  color: string;
}
interface Employee {
  id: string;
  full_name: string;
  employee_id: string;
  department: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEPT_PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f472b6",
  "#34d399",
];

const EXPORT_TYPES = [
  {
    id: "full",
    icon: "file-text",
    label: "Full Report",
    desc: "All employees, all dates",
    color: "#3b82f6",
  },
  {
    id: "employee",
    icon: "user",
    label: "By Employee",
    desc: "Single employee attendance",
    color: "#22c55e",
  },
  {
    id: "department",
    icon: "briefcase",
    label: "By Department",
    desc: "One department's records",
    color: "#f59e0b",
  },
  {
    id: "date",
    icon: "calendar",
    label: "By Date",
    desc: "Specific day export",
    color: "#8b5cf6",
  },
  {
    id: "daterange",
    icon: "trending-up",
    label: "Date Range",
    desc: "Custom from–to range",
    color: "#ef4444",
  },
  {
    id: "summary",
    icon: "bar-chart-2",
    label: "Summary Sheet",
    desc: "Dept totals + KPIs only",
    color: "#06b6d4",
  },
] as const;

type ExportTypeId = (typeof EXPORT_TYPES)[number]["id"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function toLocalDate(ts: string) {
  return new Date(ts).toISOString().split("T")[0];
}
function toTimeStr(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function hoursStr(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return "—";
  const diff =
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
    (1000 * 60 * 60);
  return `${diff.toFixed(2)}h`;
}
function isLate(checkIn: string | null) {
  if (!checkIn) return false;
  return new Date(checkIn).getHours() >= 10;
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({
  value,
  label,
  color,
  icon,
  index,
}: {
  value: string;
  label: string;
  color: string;
  icon: string;
  index: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={[
        styles.kpiCard,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[color + "25", color + "08"]}
        style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
      />
      <View
        style={[
          styles.kpiIconRing,
          { borderColor: color + "40", backgroundColor: color + "15" },
        ]}
      >
        <Feather name={icon as any} size={15} color={color} />
      </View>
      <Text style={[styles.kpiVal, { color }]}>{value}</Text>
      <Text style={styles.kpiLbl}>{label}</Text>
    </Animated.View>
  );
}

// ─── WEEKLY BAR ───────────────────────────────────────────────────────────────
function WeeklyBar({ data }: { data: WeeklyItem[] }) {
  const max = Math.max(...data.map((d) => d.present), 1);
  const today = new Date().toISOString().split("T")[0];

  return (
    <View style={styles.barWrap}>
      {data.map((d, i) => {
        const pct = d.present / max;
        const isToday = d.date === today;
        const rate = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;

        return (
          <View key={i} style={styles.barCol}>
            {d.present > 0 && (
              <Text style={[styles.barPct, isToday && { color: "#60a5fa" }]}>
                {rate}%
              </Text>
            )}
            <View style={styles.barTrack}>
              {isToday ? (
                <LinearGradient
                  colors={["#1d4ed8", "#60a5fa"]}
                  style={[
                    styles.barFill,
                    { height: `${Math.max(pct * 100, 4)}%` },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(pct * 100, 4)}%`,
                      backgroundColor:
                        d.present === 0
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(96,165,250,0.25)",
                    },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.barDay,
                isToday && { color: "#60a5fa", fontWeight: "800" },
              ]}
            >
              {d.day}
            </Text>
            {isToday && <View style={styles.barTodayDot} />}
          </View>
        );
      })}
    </View>
  );
}

// ─── DEPT ROW ─────────────────────────────────────────────────────────────────
function DeptRow({ item, index }: { item: DeptItem; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const total = item.present + item.absent + item.late;
  const pct = total > 0 ? item.present / total : 0;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 800,
      delay: index * 120,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const animWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.deptRow}>
      <View style={styles.deptLeft}>
        <View style={[styles.deptDot, { backgroundColor: item.color }]} />
        <Text style={styles.deptName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <View style={styles.deptBarOuter}>
        <Animated.View
          style={[
            styles.deptBarInner,
            { width: animWidth, backgroundColor: item.color },
          ]}
        />
      </View>
      <View style={styles.deptRight}>
        <Text style={[styles.deptPct, { color: item.color }]}>
          {Math.round(pct * 100)}%
        </Text>
        <Text style={styles.deptFraction}>
          {item.present}/{total}
        </Text>
      </View>
    </View>
  );
}

// ─── EXPORT MODAL ─────────────────────────────────────────────────────────────
function ExportModal({
  visible,
  onClose,
  employees,
  departments,
  attendanceData,
}: {
  visible: boolean;
  onClose: () => void;
  employees: Employee[];
  departments: string[];
  attendanceData: any[];
}) {
  const [step, setStep] = useState<"type" | "config">("type");
  const [exportType, setExportType] = useState<ExportTypeId>("full");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [empSearch, setEmpSearch] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setStep("type");
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const filteredEmps = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(empSearch.toLowerCase()) ||
      e.employee_id?.toLowerCase().includes(empSearch.toLowerCase()),
  );

  // ── Build & share Excel ──────────────────────────────────────────────────
  const doExport = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      let filename = "attendance";

      const baseRow = (item: any) => ({
        Date: new Date(item.created_at).toLocaleDateString("en-IN"),
        "Employee Name": item.profiles?.full_name ?? "—",
        "Employee ID": item.profiles?.employee_id ?? "—",
        Department: item.profiles?.department ?? "—",
        "Check-In": toTimeStr(item.check_in),
        "Check-Out": toTimeStr(item.check_out),
        "Total Hours": hoursStr(item.check_in, item.check_out),
        Status: !item.check_in
          ? "Absent"
          : isLate(item.check_in)
            ? "Late"
            : "Present",
      });

      if (exportType === "full") {
        const rows = attendanceData.map(baseRow);
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          "All Attendance",
        );
        filename = "attendance_full";
      } else if (exportType === "employee") {
        const emp = employees.find((e) => e.id === selectedEmployee);
        const rows = attendanceData
          .filter(
            (a) =>
              a.employee_id === selectedEmployee ||
              a.profiles?.full_name === emp?.full_name,
          )
          .map(baseRow);
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          emp?.full_name ?? "Employee",
        );
        filename = `attendance_${emp?.employee_id ?? "emp"}`;
      } else if (exportType === "department") {
        const rows = attendanceData
          .filter((a) => a.profiles?.department === selectedDept)
          .map(baseRow);
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          selectedDept,
        );
        filename = `attendance_${selectedDept.replace(/\s/g, "_")}`;
      } else if (exportType === "date") {
        const rows = attendanceData
          .filter((a) => toLocalDate(a.created_at) === selectedDate)
          .map(baseRow);
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          selectedDate,
        );
        filename = `attendance_${selectedDate}`;
      } else if (exportType === "daterange") {
        const from = new Date(dateFrom).getTime();
        const to = new Date(dateTo).getTime();
        const rows = attendanceData
          .filter((a) => {
            const t = new Date(a.created_at).getTime();
            return t >= from && t <= to;
          })
          .map(baseRow);
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          `${dateFrom} to ${dateTo}`,
        );
        filename = `attendance_${dateFrom}_to_${dateTo}`;
      } else if (exportType === "summary") {
        // Sheet 1: dept summary
        const deptRows = [
          ...new Set(
            attendanceData.map((a) => a.profiles?.department).filter(Boolean),
          ),
        ].map((dept) => {
          const recs = attendanceData.filter(
            (a) => a.profiles?.department === dept,
          );
          const present = recs.filter(
            (a) => a.check_in && !isLate(a.check_in),
          ).length;
          const late = recs.filter((a) => isLate(a.check_in)).length;
          const absent = recs.filter((a) => !a.check_in).length;
          return {
            Department: dept,
            Present: present,
            Late: late,
            Absent: absent,
            Total: recs.length,
            "Rate%":
              recs.length > 0
                ? Math.round(((present + late) / recs.length) * 100)
                : 0,
          };
        });
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(deptRows),
          "Dept Summary",
        );

        // Sheet 2: employee summary
        const empRows = employees.map((emp) => {
          const recs = attendanceData.filter(
            (a) => a.profiles?.full_name === emp.full_name,
          );
          const present = recs.filter(
            (a) => a.check_in && !isLate(a.check_in),
          ).length;
          const late = recs.filter((a) => isLate(a.check_in)).length;
          const absent = recs.filter((a) => !a.check_in).length;
          return {
            Employee: emp.full_name,
            ID: emp.employee_id,
            Dept: emp.department,
            Present: present,
            Late: late,
            Absent: absent,
            Total: recs.length,
          };
        });
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(empRows),
          "Employee Summary",
        );
        filename = "attendance_summary";
      }

      const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const uri = (FileSystem.documentDirectory ?? "") + `${filename}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(uri);
      onClose();
    } catch (e) {
      console.log(e);
    } finally {
      setExporting(false);
    }
  };

  const selectedCfg = EXPORT_TYPES.find((t) => t.id === exportType)!;

  const canExport = () => {
    if (exportType === "employee") return !!selectedEmployee;
    if (exportType === "department") return !!selectedDept;
    if (exportType === "date") return !!selectedDate;
    if (exportType === "daterange") return !!dateFrom && !!dateTo;
    return true;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalSheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={["#0f172a", "#0c1628"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
          />

          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            {step === "config" && (
              <TouchableOpacity
                onPress={() => setStep("type")}
                style={styles.modalBack}
              >
                <Feather name="arrow-left" size={16} color="#60a5fa" />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {step === "type" ? "Export Attendance" : selectedCfg.label}
              </Text>
              <Text style={styles.modalSubtitle}>
                {step === "type" ? "Choose export format" : selectedCfg.desc}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Feather name="x" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* ── STEP 1: type picker ─────────────────────────────────── */}
          {step === "type" && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 420 }}
            >
              <View style={styles.exportGrid}>
                {EXPORT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.exportTypeCard,
                      exportType === t.id && { borderColor: t.color + "70" },
                    ]}
                    onPress={() => {
                      setExportType(t.id);
                      setStep("config");
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={
                        exportType === t.id
                          ? [t.color + "30", t.color + "10"]
                          : ["rgba(255,255,255,0.04)", "transparent"]
                      }
                      style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                    />
                    <View
                      style={[
                        styles.exportTypeIcon,
                        {
                          backgroundColor: t.color + "20",
                          borderColor: t.color + "30",
                        },
                      ]}
                    >
                      <Feather name={t.icon as any} size={18} color={t.color} />
                    </View>
                    <Text
                      style={[
                        styles.exportTypeLabel,
                        { color: exportType === t.id ? "#f1f5f9" : "#94a3b8" },
                      ]}
                    >
                      {t.label}
                    </Text>
                    <Text style={styles.exportTypeDesc}>{t.desc}</Text>
                    {exportType === t.id && (
                      <View
                        style={[
                          styles.exportTypeCheck,
                          { backgroundColor: t.color },
                        ]}
                      >
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* ── STEP 2: config ──────────────────────────────────────── */}
          {step === "config" && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
            >
              <View style={{ padding: 4 }}>
                {/* By Employee */}
                {exportType === "employee" && (
                  <View>
                    <Text style={styles.configLabel}>SEARCH EMPLOYEE</Text>
                    <View style={styles.configSearch}>
                      <Feather name="search" size={14} color="#475569" />
                      <TextInput
                        placeholder="Name or ID…"
                        placeholderTextColor="#334155"
                        value={empSearch}
                        onChangeText={setEmpSearch}
                        style={styles.configSearchInput}
                      />
                    </View>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {filteredEmps.map((e) => (
                        <TouchableOpacity
                          key={e.id}
                          style={[
                            styles.empOption,
                            selectedEmployee === e.id && styles.empOptionActive,
                          ]}
                          onPress={() => setSelectedEmployee(e.id)}
                        >
                          {selectedEmployee === e.id && (
                            <LinearGradient
                              colors={["rgba(34,197,94,0.15)", "transparent"]}
                              style={[
                                StyleSheet.absoluteFill,
                                { borderRadius: 14 },
                              ]}
                            />
                          )}
                          <View style={styles.empOptionAvatar}>
                            <Text style={styles.empOptionAvatarText}>
                              {e.full_name?.[0]?.toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.empOptionName,
                                selectedEmployee === e.id && {
                                  color: "#4ade80",
                                },
                              ]}
                            >
                              {e.full_name}
                            </Text>
                            <Text style={styles.empOptionId}>
                              {e.employee_id} · {e.department}
                            </Text>
                          </View>
                          {selectedEmployee === e.id && (
                            <Feather
                              name="check-circle"
                              size={16}
                              color="#4ade80"
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* By Department */}
                {exportType === "department" && (
                  <View>
                    <Text style={styles.configLabel}>SELECT DEPARTMENT</Text>
                    {departments.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.empOption,
                          selectedDept === d && styles.empOptionActive,
                        ]}
                        onPress={() => setSelectedDept(d)}
                      >
                        {selectedDept === d && (
                          <LinearGradient
                            colors={["rgba(245,158,11,0.15)", "transparent"]}
                            style={[
                              StyleSheet.absoluteFill,
                              { borderRadius: 14 },
                            ]}
                          />
                        )}
                        <View
                          style={[
                            styles.empOptionAvatar,
                            { backgroundColor: "rgba(245,158,11,0.15)" },
                          ]}
                        >
                          <Feather name="briefcase" size={14} color="#f59e0b" />
                        </View>
                        <Text
                          style={[
                            styles.empOptionName,
                            selectedDept === d && { color: "#f59e0b" },
                          ]}
                        >
                          {d}
                        </Text>
                        {selectedDept === d && (
                          <Feather
                            name="check-circle"
                            size={16}
                            color="#f59e0b"
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* By Date */}
                {exportType === "date" && (
                  <View>
                    <Text style={styles.configLabel}>
                      SELECT DATE (YYYY-MM-DD)
                    </Text>
                    <View style={styles.configInput}>
                      <Feather name="calendar" size={14} color="#8b5cf6" />
                      <TextInput
                        placeholder="2025-01-15"
                        placeholderTextColor="#334155"
                        value={selectedDate}
                        onChangeText={setSelectedDate}
                        style={styles.configInputText}
                      />
                    </View>
                    <Text style={styles.configHint}>Format: YYYY-MM-DD</Text>
                  </View>
                )}

                {/* Date Range */}
                {exportType === "daterange" && (
                  <View style={{ gap: 12 }}>
                    <Text style={styles.configLabel}>SELECT DATE RANGE</Text>
                    <View>
                      <Text style={styles.configFieldLabel}>FROM</Text>
                      <View style={styles.configInput}>
                        <Feather name="calendar" size={14} color="#ef4444" />
                        <TextInput
                          placeholder="2025-01-01"
                          placeholderTextColor="#334155"
                          value={dateFrom}
                          onChangeText={setDateFrom}
                          style={styles.configInputText}
                        />
                      </View>
                    </View>
                    <View>
                      <Text style={styles.configFieldLabel}>TO</Text>
                      <View style={styles.configInput}>
                        <Feather name="calendar" size={14} color="#ef4444" />
                        <TextInput
                          placeholder="2025-01-31"
                          placeholderTextColor="#334155"
                          value={dateTo}
                          onChangeText={setDateTo}
                          style={styles.configInputText}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Full / Summary — no config needed */}
                {(exportType === "full" || exportType === "summary") && (
                  <View style={styles.noConfigWrap}>
                    <View
                      style={[
                        styles.noConfigIcon,
                        { backgroundColor: selectedCfg.color + "15" },
                      ]}
                    >
                      <Feather
                        name={selectedCfg.icon as any}
                        size={28}
                        color={selectedCfg.color}
                      />
                    </View>
                    <Text style={styles.noConfigText}>Ready to export</Text>
                    <Text style={styles.noConfigSub}>
                      {exportType === "full"
                        ? `${attendanceData.length} records across all employees`
                        : "Department totals + per-employee summary (2 sheets)"}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          {/* Export button */}
          {step === "config" && (
            <TouchableOpacity
              style={[styles.exportCta, !canExport() && { opacity: 0.4 }]}
              onPress={doExport}
              disabled={!canExport() || exporting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[selectedCfg.color, selectedCfg.color + "bb"]}
                style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              {exporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="download" size={18} color="#fff" />
                  <Text style={styles.exportCtaText}>Export & Share</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [exportVisible, setExportVisible] = useState(false);

  const [weeklyData, setWeeklyData] = useState<WeeklyItem[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DeptItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [avgHours, setAvgHours] = useState(0);

  const headerAnim = useRef(new Animated.Value(0)).current;

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data: emps } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "employee");
      const { data: attn } = await supabase
        .from("attendance")
        .select("*, profiles(full_name, department, employee_id)");

      if (!emps || !attn) {
        setLoading(false);
        return;
      }

      setEmployees(emps);
      setAttendanceData(attn);
      setDepartments([
        ...new Set(emps.map((e: any) => e.department).filter(Boolean)),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const todayRecs = attn.filter((a) => toLocalDate(a.created_at) === today);

      const present = todayRecs.filter((a) => !!a.check_in).length;
      const absent = emps.length - present;
      const late = todayRecs.filter((a) => isLate(a.check_in)).length;
      const rate =
        emps.length > 0 ? Math.round((present / emps.length) * 100) : 0;

      setPresentCount(present);
      setAbsentCount(absent);
      setLateCount(late);
      setAttendanceRate(rate);

      let overtime = 0,
        totalHrs = 0,
        hrsCount = 0;
      todayRecs.forEach((a) => {
        if (a.check_in && a.check_out) {
          const diff =
            (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) /
            (1000 * 60 * 60);
          if (diff > 8) overtime += diff - 8;
          totalHrs += diff;
          hrsCount++;
        }
      });
      setOvertimeHours(Number(overtime.toFixed(1)));
      setAvgHours(hrsCount > 0 ? Number((totalHrs / hrsCount).toFixed(1)) : 0);

      // Weekly
      const week: WeeklyItem[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split("T")[0];
        week.push({
          day: d.toLocaleDateString("en-US", { weekday: "short" }),
          present: attn.filter(
            (a) => toLocalDate(a.created_at) === date && !!a.check_in,
          ).length,
          total: emps.length,
          date,
        });
      }
      setWeeklyData(week);

      // Dept stats
      const deptMap: Record<string, DeptItem> = {};
      emps.forEach((emp: any, idx: number) => {
        const n = emp.department || "Unknown";
        if (!deptMap[n])
          deptMap[n] = {
            name: n,
            present: 0,
            absent: 0,
            late: 0,
            color: DEPT_PALETTE[idx % DEPT_PALETTE.length],
          };
      });
      todayRecs.forEach((a) => {
        const d = a.profiles?.department;
        if (d && deptMap[d]) {
          if (isLate(a.check_in)) deptMap[d].late++;
          else if (a.check_in) deptMap[d].present++;
        }
      });
      Object.keys(deptMap).forEach((d) => {
        const total = emps.filter((e: any) => e.department === d).length;
        deptMap[d].absent = total - deptMap[d].present - deptMap[d].late;
      });
      setDepartmentStats(Object.values(deptMap));

      setLoading(false);
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  // ── Donut ring dimensions ────────────────────────────────────────────────
  const RING = 118;
  const STROKE = 10;

  if (loading) {
    return (
      <GradientScreen>
        <SafeAreaView
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: "#475569", marginTop: 14, fontSize: 13 }}>
            Loading analytics…
          </Text>
        </SafeAreaView>
      </GradientScreen>
    );
  }

  return (
    <GradientScreen>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* ── STICKY HEADER ────────────────────────────────────────── */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <View>
            <Text style={styles.headerEyebrow}>ANALYTICS</Text>
            <Text style={styles.headerTitle}>Reports</Text>
          </View>
          <TouchableOpacity
            style={styles.exportFab}
            onPress={() => setExportVisible(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#1d4ed8", "#3b82f6"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <Feather name="download" size={16} color="#fff" />
            <Text style={styles.exportFabText}>Export</Text>
          </TouchableOpacity>
        </Animated.View>

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
          {/* ── KPI ROW ─────────────────────────────────────────────── */}
          <View style={styles.kpiRow}>
            <KpiCard
              value={`${attendanceRate}%`}
              label="Rate"
              color="#4ade80"
              icon="trending-up"
              index={0}
            />
            <KpiCard
              value={`${lateCount}`}
              label="Late"
              color="#fbbf24"
              icon="clock"
              index={1}
            />
            <KpiCard
              value={`${absentCount}`}
              label="Absent"
              color="#f87171"
              icon="user-x"
              index={2}
            />
            <KpiCard
              value={`${avgHours}h`}
              label="Avg Hrs"
              color="#a78bfa"
              icon="activity"
              index={3}
            />
          </View>

          {/* ── WEEKLY CHART ─────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>ATTENDANCE TREND</Text>
                <Text style={styles.cardTitle}>Last 7 Days</Text>
              </View>
              <View style={styles.periodPills}>
                {(["day", "week", "month"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.periodPill,
                      period === p && styles.periodPillActive,
                    ]}
                    onPress={() => setPeriod(p)}
                  >
                    {period === p && (
                      <LinearGradient
                        colors={["#1d4ed8", "#3b82f6"]}
                        style={[StyleSheet.absoluteFill, { borderRadius: 10 }]}
                      />
                    )}
                    <Text
                      style={[
                        styles.periodText,
                        period === p && { color: "#fff" },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <WeeklyBar data={weeklyData} />
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <LinearGradient
                  colors={["#1d4ed8", "#60a5fa"]}
                  style={styles.legendDot}
                />
                <Text style={styles.legendText}>Today</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: "rgba(96,165,250,0.25)" },
                  ]}
                />
                <Text style={styles.legendText}>Other days</Text>
              </View>
            </View>
          </View>

          {/* ── SUMMARY CARD ─────────────────────────────────────────── */}
          <View style={[styles.card, styles.summaryCard]}>
            {/* Left */}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardEyebrow}>TODAY</Text>
              <Text style={styles.cardTitle}>Overview</Text>

              <View style={{ marginTop: 18, gap: 14 }}>
                {[
                  { label: "Present", value: presentCount, color: "#4ade80" },
                  { label: "Late", value: lateCount, color: "#fbbf24" },
                  { label: "Absent", value: absentCount, color: "#f87171" },
                  {
                    label: "OT Hrs",
                    value: `${overtimeHours}h`,
                    color: "#a78bfa",
                  },
                ].map((row) => (
                  <View key={row.label} style={styles.summaryRow}>
                    <View
                      style={[
                        styles.summaryDot,
                        { backgroundColor: row.color },
                      ]}
                    />
                    <Text style={styles.summaryLabel}>{row.label}</Text>
                    <Text style={[styles.summaryVal, { color: row.color }]}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Right — rate ring */}
            <View style={styles.ringWrap}>
              <View
                style={[
                  styles.ringOuter,
                  {
                    width: RING,
                    height: RING,
                    borderRadius: RING / 2,
                    borderWidth: STROKE,
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    attendanceRate >= 85
                      ? ["#059669", "#4ade80"]
                      : attendanceRate >= 70
                        ? ["#d97706", "#fbbf24"]
                        : ["#dc2626", "#f87171"]
                  }
                  style={[
                    StyleSheet.absoluteFill,
                    { borderRadius: RING / 2, opacity: 0.25 },
                  ]}
                />
                <Text style={styles.ringValue}>{attendanceRate}%</Text>
                <Text style={styles.ringLabel}>Today</Text>
              </View>
            </View>
          </View>

          {/* ── DEPT BREAKDOWN ───────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>BY DEPARTMENT</Text>
            <Text style={[styles.cardTitle, { marginBottom: 18 }]}>
              Breakdown
            </Text>
            {departmentStats.length === 0 ? (
              <Text style={{ color: "#334155", fontSize: 12 }}>
                No data yet
              </Text>
            ) : (
              departmentStats.map((d, i) => (
                <DeptRow key={d.name} item={d} index={i} />
              ))
            )}
          </View>

          {/* ── EXPORT SHORTCUT CARD ─────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>DATA EXPORT</Text>
            <Text style={[styles.cardTitle, { marginBottom: 6 }]}>
              Export Center
            </Text>
            <Text style={styles.exportCardSub}>
              6 export formats available — filter by employee, department, date
              or range
            </Text>

            <View style={styles.exportShortcuts}>
              {EXPORT_TYPES.slice(0, 3).map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.shortcutChip}
                  onPress={() => setExportVisible(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[t.color + "20", t.color + "08"]}
                    style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                  />
                  <Feather name={t.icon as any} size={13} color={t.color} />
                  <Text style={[styles.shortcutText, { color: t.color }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.exportOpenBtn}
              onPress={() => setExportVisible(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#1d4ed8", "#3b82f6"]}
                style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
              />
              <Feather name="download-cloud" size={18} color="#fff" />
              <Text style={styles.exportOpenText}>Open Export Center</Text>
              <Feather
                name="arrow-right"
                size={16}
                color="rgba(255,255,255,0.6)"
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ── EXPORT MODAL ─────────────────────────────────────────────── */}
      <ExportModal
        visible={exportVisible}
        onClose={() => setExportVisible(false)}
        employees={employees}
        departments={departments}
        attendanceData={attendanceData}
      />
    </GradientScreen>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingBottom: 130 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
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
  exportFab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  exportFabText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // KPI
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    gap: 4,
  },
  kpiIconRing: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
  kpiVal: { fontSize: 17, fontWeight: "900" },
  kpiLbl: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
  },

  // Cards
  card: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardEyebrow: {
    color: "#1d4ed8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 3,
  },
  cardTitle: { color: "#f1f5f9", fontSize: 17, fontWeight: "800" },

  // Period pills
  periodPills: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 13,
    padding: 3,
  },
  periodPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: "hidden",
  },
  periodPillActive: {},
  periodText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  // Bar chart
  barWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 130,
    gap: 5,
  },
  barCol: { flex: 1, alignItems: "center" },
  barPct: { color: "#64748b", fontSize: 8, marginBottom: 4 },
  barTrack: {
    width: "100%",
    height: 95,
    justifyContent: "flex-end",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  barFill: { width: "100%", borderRadius: 8 },
  barDay: { color: "#475569", fontSize: 10, marginTop: 7 },
  barTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3b82f6",
    marginTop: 3,
  },
  chartLegend: { flexDirection: "row", gap: 16, marginTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: "#475569", fontSize: 11 },

  // Summary
  summaryCard: { flexDirection: "row", alignItems: "center" },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryLabel: { color: "#64748b", flex: 1, fontSize: 12, fontWeight: "600" },
  summaryVal: { fontSize: 17, fontWeight: "900" },

  // Ring
  ringWrap: { justifyContent: "center", alignItems: "center", marginLeft: 16 },
  ringOuter: {
    justifyContent: "center",
    alignItems: "center",
    borderColor: "rgba(59,130,246,0.35)",
    overflow: "hidden",
  },
  ringValue: { color: "#f1f5f9", fontSize: 22, fontWeight: "900" },
  ringLabel: { color: "#475569", fontSize: 10, fontWeight: "700" },

  // Dept rows
  deptRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  deptLeft: { flexDirection: "row", alignItems: "center", gap: 8, width: 92 },
  deptDot: { width: 8, height: 8, borderRadius: 4 },
  deptName: { color: "#94a3b8", fontSize: 11, fontWeight: "600", flex: 1 },
  deptBarOuter: {
    flex: 1,
    height: 7,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  deptBarInner: { height: "100%", borderRadius: 6 },
  deptRight: { width: 50, alignItems: "flex-end" },
  deptPct: { fontSize: 12, fontWeight: "800" },
  deptFraction: { color: "#334155", fontSize: 10 },

  // Export card
  exportCardSub: {
    color: "#475569",
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  exportShortcuts: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  shortcutChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  shortcutText: { fontSize: 11, fontWeight: "700" },
  exportOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 18,
    overflow: "hidden",
  },
  exportOpenText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
    textAlign: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 36,
    overflow: "hidden",
    minHeight: 420,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 10,
  },
  modalBack: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(96,165,250,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  modalTitle: { color: "#f1f5f9", fontSize: 20, fontWeight: "900" },
  modalSubtitle: { color: "#475569", fontSize: 12, marginTop: 2 },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Export type grid
  exportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 10,
  },
  exportTypeCard: {
    width: (width - 72) / 2,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    gap: 6,
  },
  exportTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  exportTypeLabel: { fontSize: 13, fontWeight: "800" },
  exportTypeDesc: { color: "#334155", fontSize: 10, lineHeight: 14 },
  exportTypeCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  // Config
  configLabel: {
    color: "#1d4ed8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  configFieldLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  configSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  configSearchInput: { flex: 1, color: "#e2e8f0", fontSize: 13 },
  configInput: {
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
  configInputText: { flex: 1, color: "#e2e8f0", fontSize: 13 },
  configHint: { color: "#334155", fontSize: 10, marginTop: 6 },

  empOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  empOptionActive: { borderColor: "rgba(74,222,128,0.3)" },
  empOptionAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(59,130,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  empOptionAvatarText: { color: "#60a5fa", fontWeight: "800", fontSize: 14 },
  empOptionName: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },
  empOptionId: { color: "#475569", fontSize: 10, marginTop: 1 },

  noConfigWrap: { alignItems: "center", paddingVertical: 30, gap: 10 },
  noConfigIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  noConfigText: { color: "#f1f5f9", fontSize: 16, fontWeight: "800" },
  noConfigSub: {
    color: "#475569",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  exportCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 17,
    borderRadius: 18,
    marginTop: 20,
    overflow: "hidden",
  },
  exportCtaText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
