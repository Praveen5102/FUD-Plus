import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";

import { Feather, Ionicons } from "@expo/vector-icons";

import { COLORS } from "../../../constants/colors";

import { supabase } from "../../../services/supabase";

import { useAuth } from "../../../context/AuthContext";

interface Attendance {
  id: string;

  check_in: string;

  check_out: string | null;

  total_hours: string | null;

  status: string;

  created_at: string;
}

export default function AttendanceHistoryScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);

  // FETCH HISTORY

  const fetchHistory = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.log(error);

        return;
      }

      setAttendanceData(data || []);

      setLoading(false);
    } catch (error) {
      console.log(error);

      setLoading(false);
    }
  };

  // INIT

  useEffect(() => {
    fetchHistory();
  }, []);

  // REFRESH

  const onRefresh = async () => {
    setRefreshing(true);

    await fetchHistory();

    setRefreshing(false);
  };

  // COUNTS

  const presentCount = attendanceData.filter(
    (item) => item.status === "Present",
  ).length;

  const absentCount = attendanceData.filter(
    (item) => item.status === "Absent",
  ).length;

  const workingDays = attendanceData.length;

  if (loading) {
    return (
      <LinearGradient
        colors={["#071226", "#0f1f3d", "#163a72", "#1d4ed8"]}
        style={styles.loader}
      >
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  return (
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
              tintColor="#fff"
            />
          }
        >
          {/* HEADER */}

          <View style={styles.header}>
            <Text style={styles.title}>Attendance History</Text>

            <View style={styles.filterButton}>
              <Feather name="calendar" size={18} color="#fff" />
            </View>
          </View>

          {/* SUMMARY */}

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{presentCount}</Text>

              <Text style={styles.summaryLabel}>Present</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{absentCount}</Text>

              <Text style={styles.summaryLabel}>Absent</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{workingDays}</Text>

              <Text style={styles.summaryLabel}>Total Days</Text>
            </View>
          </View>

          {/* HISTORY */}

          {attendanceData.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View>
                <Text style={styles.historyDate}>
                  {new Date(item.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",

                    month: "short",

                    year: "numeric",
                  })}
                </Text>

                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={14} color="#dbeafe" />

                  <Text style={styles.historyTime}>
                    {item.check_in
                      ? new Date(item.check_in).toLocaleTimeString([], {
                          hour: "2-digit",

                          minute: "2-digit",

                          hour12: true,
                        })
                      : "--"}

                    {" → "}

                    {item.check_out
                      ? new Date(item.check_out).toLocaleTimeString([], {
                          hour: "2-digit",

                          minute: "2-digit",

                          hour12: true,
                        })
                      : "--"}
                  </Text>
                </View>

                <Text style={styles.totalHours}>
                  Total Hours: {item.total_hours || "--"}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,

                  item.status === "Present"
                    ? styles.presentBadge
                    : styles.absentBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,

                    item.status === "Present"
                      ? styles.presentText
                      : styles.absentText,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loader: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",
  },

  safeArea: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,

    paddingBottom: 120,
  },

  header: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 26,
  },

  title: {
    color: "#fff",

    fontSize: 24,

    fontWeight: "800",
  },

  filterButton: {
    width: 42,
    height: 42,

    borderRadius: 21,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.12)",
  },

  summaryRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    marginBottom: 28,
  },

  summaryCard: {
    flex: 1,

    marginHorizontal: 4,

    padding: 18,

    borderRadius: 22,

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.08)",
  },

  summaryValue: {
    color: "#fff",

    fontSize: 22,

    fontWeight: "800",
  },

  summaryLabel: {
    color: "#dbeafe",

    fontSize: 12,

    marginTop: 8,
  },

  historyCard: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    padding: 18,

    borderRadius: 24,

    marginBottom: 16,

    backgroundColor: "rgba(255,255,255,0.08)",
  },

  historyDate: {
    color: "#fff",

    fontSize: 15,

    fontWeight: "700",
  },

  timeRow: {
    flexDirection: "row",

    alignItems: "center",

    marginTop: 10,
  },

  historyTime: {
    color: "#dbeafe",

    marginLeft: 8,

    fontSize: 13,
  },

  totalHours: {
    color: "#93c5fd",

    fontSize: 12,

    marginTop: 8,
  },

  statusBadge: {
    paddingHorizontal: 14,

    paddingVertical: 8,

    borderRadius: 18,
  },

  presentBadge: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },

  absentBadge: {
    backgroundColor: "rgba(239,68,68,0.15)",
  },

  statusText: {
    fontSize: 12,

    fontWeight: "700",
  },

  presentText: {
    color: "#22c55e",
  },

  absentText: {
    color: "#ef4444",
  },
});
