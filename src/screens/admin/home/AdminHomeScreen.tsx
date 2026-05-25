import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
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

import * as XLSX from "xlsx";

import * as Sharing from "expo-sharing";

import * as FileSystem from "expo-file-system/legacy";

import GradientScreen from "../../../components/layout/GradientScreen";

import AppHeader from "../../../components/ui/AppHeader";

import { APP_COLORS } from "../../../theme/appTheme";

import { supabase } from "../../../services/supabase";

interface Employee {
  id: string;

  full_name: string;

  department: string;

  employee_id: string;

  profile_image?: string;
}

interface Attendance {
  id: string;

  employee_id: string;

  check_in: string;

  check_out: string | null;

  created_at: string;

  profiles: {
    full_name: string;

    department: string;

    employee_id: string;
  };
}

export default function AdminHomeScreen() {
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);

  const [activeTab, setActiveTab] = useState<
    "employees" | "present" | "absent" | "rate"
  >("employees");

  // FETCH DATA

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const { data: employeeData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "employee");

      const today = new Date().toISOString().split("T")[0];

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select(
          `
          *,
          profiles (
            full_name,
            department,
            employee_id
          )
        `,
        )
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      setEmployees(employeeData || []);

      setTodayAttendance(attendanceData || []);

      setLoading(false);
    } catch (error) {
      console.log(error);

      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);

    await fetchDashboard();

    setRefreshing(false);
  };

  // COUNTS

  const presentCount = todayAttendance.filter((item) => item.check_in).length;

  const absentCount = employees.length - presentCount;

  const attendanceRate =
    employees.length > 0
      ? Math.round((presentCount / employees.length) * 100)
      : 0;

  // PRESENT IDS

  const presentEmployeeIds = todayAttendance.map((item) => item.employee_id);

  // FILTERS

  const presentEmployees = employees.filter((emp) =>
    presentEmployeeIds.includes(emp.id),
  );

  const absentEmployees = employees.filter(
    (emp) => !presentEmployeeIds.includes(emp.id),
  );

  // EXPORT

  const exportAttendance = async () => {
    try {
      const exportData = todayAttendance.map((item: any) => ({
        Name: item.profiles?.full_name,

        Department: item.profiles?.department,

        EmployeeID: item.profiles?.employee_id,

        CheckIn: item.check_in
          ? new Date(item.check_in).toLocaleTimeString()
          : "-",

        CheckOut: item.check_out
          ? new Date(item.check_out).toLocaleTimeString()
          : "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      const excelData = XLSX.write(workbook, {
        type: "base64",

        bookType: "xlsx",
      });

      const fileUri = FileSystem.documentDirectory + "attendance.xlsx";

      await FileSystem.writeAsStringAsync(fileUri, excelData, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <GradientScreen>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
        >
          {/* HEADER */}

          <AppHeader
            title="Dashboard"
            subtitle="Realtime Attendance Monitoring"
          />

          {/* TOP BOXES */}

          <View style={styles.statsGrid}>
            {/* EMPLOYEES */}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.statCard,

                activeTab === "employees" && {
                  borderColor: "#93c5fd",

                  backgroundColor: "rgba(147,197,253,0.10)",
                },
              ]}
              onPress={() => setActiveTab("employees")}
            >
              <View
                style={[
                  styles.iconWrap,

                  {
                    backgroundColor: "rgba(147,197,253,0.12)",
                  },
                ]}
              >
                <Ionicons name="people-outline" size={22} color="#93c5fd" />
              </View>

              <Text style={styles.statValue}>{employees.length}</Text>

              <Text style={styles.statLabel}>Employees</Text>
            </TouchableOpacity>

            {/* PRESENT */}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.statCard,

                activeTab === "present" && {
                  borderColor: "#4ade80",

                  backgroundColor: "rgba(74,222,128,0.10)",
                },
              ]}
              onPress={() => setActiveTab("present")}
            >
              <View
                style={[
                  styles.iconWrap,

                  {
                    backgroundColor: "rgba(74,222,128,0.12)",
                  },
                ]}
              >
                <Feather name="check-circle" size={22} color="#4ade80" />
              </View>

              <Text style={styles.statValue}>{presentCount}</Text>

              <Text style={styles.statLabel}>Present</Text>
            </TouchableOpacity>

            {/* ABSENT */}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.statCard,

                activeTab === "absent" && {
                  borderColor: "#f87171",

                  backgroundColor: "rgba(248,113,113,0.10)",
                },
              ]}
              onPress={() => setActiveTab("absent")}
            >
              <View
                style={[
                  styles.iconWrap,

                  {
                    backgroundColor: "rgba(248,113,113,0.12)",
                  },
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color="#f87171"
                />
              </View>

              <Text style={styles.statValue}>{absentCount}</Text>

              <Text style={styles.statLabel}>Absent</Text>
            </TouchableOpacity>

            {/* RATE */}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.statCard,

                activeTab === "rate" && {
                  borderColor: "#c084fc",

                  backgroundColor: "rgba(192,132,252,0.10)",
                },
              ]}
              onPress={() => setActiveTab("rate")}
            >
              <View
                style={[
                  styles.iconWrap,

                  {
                    backgroundColor: "rgba(192,132,252,0.12)",
                  },
                ]}
              >
                <Feather name="activity" size={22} color="#c084fc" />
              </View>

              <Text style={styles.statValue}>{attendanceRate}%</Text>

              <Text style={styles.statLabel}>Attendance</Text>
            </TouchableOpacity>
          </View>

          {/* LIST TITLE */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === "employees"
                ? "All Employees"
                : activeTab === "present"
                  ? "Present Employees"
                  : activeTab === "absent"
                    ? "Absent Employees"
                    : "Attendance Report"}
            </Text>
          </View>

          {/* EMPLOYEE LIST */}

          {activeTab === "employees" &&
            employees.map((item, index) => (
              <View key={index} style={styles.activityCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name?.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>{item.full_name}</Text>

                  <Text style={styles.activityDept}>{item.department}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: presentEmployeeIds.includes(item.id)
                        ? "rgba(74,222,128,0.18)"
                        : "rgba(248,113,113,0.18)",
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {presentEmployeeIds.includes(item.id)
                      ? "Present"
                      : "Absent"}
                  </Text>
                </View>
              </View>
            ))}

          {/* PRESENT */}

          {activeTab === "present" &&
            presentEmployees.map((item, index) => (
              <View key={index} style={styles.activityCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name?.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>{item.full_name}</Text>

                  <Text style={styles.activityDept}>{item.department}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: "rgba(74,222,128,0.18)",
                    },
                  ]}
                >
                  <Text style={styles.statusText}>Present</Text>
                </View>
              </View>
            ))}

          {/* ABSENT */}

          {activeTab === "absent" &&
            absentEmployees.map((item, index) => (
              <View key={index} style={styles.activityCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name?.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>{item.full_name}</Text>

                  <Text style={styles.activityDept}>{item.department}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: "rgba(248,113,113,0.18)",
                    },
                  ]}
                >
                  <Text style={styles.statusText}>Absent</Text>
                </View>
              </View>
            ))}

          {/* RATE */}

          {activeTab === "rate" && (
            <View style={styles.rateCard}>
              <Text style={styles.rateText}>
                Total Employees: {employees.length}
              </Text>

              <Text style={styles.rateText}>Present Today: {presentCount}</Text>

              <Text style={styles.rateText}>Absent Today: {absentCount}</Text>

              <Text style={styles.bigRate}>{attendanceRate}%</Text>
            </View>
          )}

          {/* EXPORT */}

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.exportBtn}
            onPress={exportAttendance}
          >
            <Feather name="download" size={18} color="#fff" />

            <Text style={styles.exportText}>Export Attendance</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  content: {
    padding: 20,

    paddingBottom: 120,
  },

  statsGrid: {
    flexDirection: "row",

    flexWrap: "wrap",

    justifyContent: "space-between",

    marginBottom: 20,
  },

  statCard: {
    width: "48%",

    padding: 18,

    borderRadius: 24,

    marginBottom: 14,

    backgroundColor: "rgba(255,255,255,0.08)",

    borderWidth: 1,

    borderColor: "rgba(255,255,255,0.08)",
  },

  iconWrap: {
    width: 46,

    height: 46,

    borderRadius: 16,

    justifyContent: "center",

    alignItems: "center",

    marginBottom: 14,
  },

  statValue: {
    color: "#fff",

    fontSize: 28,

    fontWeight: "900",
  },

  statLabel: {
    color: "#94a3b8",

    marginTop: 6,
  },

  sectionHeader: {
    marginBottom: 16,
  },

  sectionTitle: {
    color: "#fff",

    fontSize: 18,

    fontWeight: "700",
  },

  activityCard: {
    flexDirection: "row",

    alignItems: "center",

    padding: 16,

    borderRadius: 24,

    marginBottom: 14,

    backgroundColor: "rgba(255,255,255,0.08)",

    borderWidth: 1,

    borderColor: "rgba(255,255,255,0.08)",
  },

  avatar: {
    width: 52,

    height: 52,

    borderRadius: 18,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "rgba(59,130,246,0.18)",
  },

  avatarText: {
    color: "#93c5fd",

    fontSize: 15,

    fontWeight: "800",
  },

  activityInfo: {
    flex: 1,

    marginLeft: 14,
  },

  activityName: {
    color: "#fff",

    fontSize: 15,

    fontWeight: "700",
  },

  activityDept: {
    color: "#94a3b8",

    marginTop: 5,

    fontSize: 12,
  },

  statusBadge: {
    paddingHorizontal: 12,

    paddingVertical: 7,

    borderRadius: 16,
  },

  statusText: {
    color: "#fff",

    fontSize: 11,

    fontWeight: "700",
  },

  rateCard: {
    backgroundColor: "rgba(255,255,255,0.08)",

    borderRadius: 24,

    padding: 24,

    alignItems: "center",
  },

  rateText: {
    color: "#cbd5e1",

    fontSize: 14,

    marginBottom: 10,
  },

  bigRate: {
    color: "#c084fc",

    fontSize: 50,

    fontWeight: "900",

    marginTop: 10,
  },

  exportBtn: {
    height: 58,

    borderRadius: 22,

    marginTop: 24,

    backgroundColor: "#2563eb",

    justifyContent: "center",

    alignItems: "center",

    flexDirection: "row",
  },

  exportText: {
    color: "#fff",

    fontSize: 15,

    fontWeight: "700",

    marginLeft: 10,
  },
});
