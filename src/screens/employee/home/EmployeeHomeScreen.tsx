import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";

import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../../services/supabase";

import { useAuth } from "../../../context/AuthContext";

import SelfieCheckInModal from "../../../components/modals/SelfieCheckInModal";

interface Attendance {
  id: string;

  check_in: string;

  check_out: string | null;

  total_hours: string | null;

  status: string;

  created_at: string;
}

export default function EmployeeHomeScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [showCamera, setShowCamera] = useState(false);

  const [profile, setProfile] = useState<any>(null);

  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);

  // GREETING

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 17
        ? "Good Afternoon"
        : "Good Evening";

  // FETCH PROFILE

  const fetchProfile = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.log(error);

        return;
      }

      setProfile(data);
    } catch (error) {
      console.log(error);
    }
  };

  // FETCH ATTENDANCE

  const fetchAttendance = async () => {
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

  // INITIAL

  useEffect(() => {
    fetchProfile();

    fetchAttendance();

    // REALTIME

    const channel = supabase
      .channel("attendance-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",

          schema: "public",

          table: "attendance",
        },
        () => {
          fetchAttendance();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // REFRESH

  const onRefresh = async () => {
    setRefreshing(true);

    await fetchProfile();

    await fetchAttendance();

    setRefreshing(false);
  };

  // TODAY ATTENDANCE

  const todayAttendance = attendanceData.find(
    (item) =>
      new Date(item.created_at).toDateString() === new Date().toDateString(),
  );

  // CHECKED IN

  const checkedIn = !!todayAttendance && !todayAttendance.check_out;

  // PRESENT DAYS

  const presentDays = attendanceData.filter(
    (item) => item.status === "Present",
  ).length;

  // ABSENT DAYS

  const absentDays = Math.max(0, 30 - presentDays);

  // OVERTIME

  const overtimeHours = attendanceData.reduce((sum, item) => {
    if (item.total_hours) {
      const hours = parseFloat(item.total_hours);

      if (hours > 8) {
        return sum + (hours - 8);
      }
    }

    return sum;
  }, 0);

  // LAST 7 DAYS

  const last7Days = attendanceData.slice(0, 7);

  if (loading) {
    return (
      <LinearGradient
        colors={["#060d1f", "#0b1533", "#0f1e42"]}
        style={styles.loader}
      >
        <ActivityIndicator size="large" color="#fff" />
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
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text style={styles.greeting}>{greeting} 👋</Text>

                <Text style={styles.name}>{profile?.full_name}</Text>

                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Ionicons
                      name="briefcase-outline"
                      size={10}
                      color="#93c5fd"
                    />

                    <Text style={styles.badgeText}>{profile?.employee_id}</Text>
                  </View>

                  <View style={styles.badge}>
                    <Ionicons
                      name="desktop-outline"
                      size={10}
                      color="#93c5fd"
                    />

                    <Text style={styles.badgeText}>{profile?.department}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.notificationButton}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />

                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>

            {/* STATUS */}

            <LinearGradient
              colors={
                checkedIn ? ["#14532d", "#166534"] : ["#1e3a5f", "#1d4ed8"]
              }
              style={styles.statusBanner}
            >
              <View style={styles.statusLeft}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: checkedIn ? "#4ade80" : "#facc15",
                    },
                  ]}
                />

                <View>
                  <Text style={styles.statusTitle}>Today's Status</Text>

                  <Text style={styles.statusValue}>
                    {checkedIn ? "Checked In" : "Not Checked In"}
                  </Text>

                  {todayAttendance?.check_in && (
                    <Text style={styles.statusTime}>
                      Since{" "}
                      {new Date(todayAttendance.check_in).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",

                          minute: "2-digit",

                          hour12: true,
                        },
                      )}
                    </Text>
                  )}
                </View>
              </View>

              <Ionicons
                name={checkedIn ? "checkmark-circle" : "time-outline"}
                size={30}
                color="#fff"
              />
            </LinearGradient>

            {/* ATTENDANCE BUTTON */}

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowCamera(true)}
            >
              <LinearGradient
                colors={
                  checkedIn ? ["#dc2626", "#ef4444"] : ["#2563eb", "#3b82f6"]
                }
                style={styles.attendanceButton}
              >
                <Ionicons
                  name={checkedIn ? "log-out-outline" : "camera-outline"}
                  size={22}
                  color="#fff"
                />

                <Text style={styles.attendanceText}>
                  {checkedIn
                    ? "Capture Checkout Selfie"
                    : "Capture Attendance Selfie"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* MONTHLY */}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Monthly Overview</Text>

              <View style={styles.monthlyGrid}>
                <View style={styles.monthCard}>
                  <Text style={styles.monthValue}>{presentDays}</Text>

                  <Text style={styles.monthLabel}>Present</Text>
                </View>

                <View style={styles.monthCard}>
                  <Text style={styles.monthValue}>{absentDays}</Text>

                  <Text style={styles.monthLabel}>Absent</Text>
                </View>

                <View style={styles.monthCard}>
                  <Text style={styles.monthValue}>
                    {overtimeHours.toFixed(1)}h
                  </Text>

                  <Text style={styles.monthLabel}>Overtime</Text>
                </View>
              </View>
            </View>

            {/* LAST 7 DAYS */}

            {last7Days.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Last 7 Days</Text>

                {last7Days.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 && <View style={styles.divider} />}

                    <View style={styles.attendanceRow}>
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>
                          {new Date(item.created_at).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                            },
                          )}
                        </Text>
                      </View>

                      <View
                        style={{
                          flex: 1,

                          marginLeft: 14,
                        }}
                      >
                        <Text style={styles.timeText}>
                          {new Date(item.check_in).toLocaleTimeString([], {
                            hour: "2-digit",

                            minute: "2-digit",

                            hour12: true,
                          })}

                          {" → "}

                          {item.check_out
                            ? new Date(item.check_out).toLocaleTimeString([], {
                                hour: "2-digit",

                                minute: "2-digit",

                                hour12: true,
                              })
                            : "--"}
                        </Text>

                        <Text style={styles.presentText}>{item.status}</Text>
                      </View>

                      <View style={styles.hoursBadge}>
                        <Text style={styles.hoursText}>
                          {item.total_hours || "--"}h
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* CAMERA MODAL */}

      <SelfieCheckInModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onSuccess={() => {
          fetchAttendance();
        }}
      />
    </>
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

    alignItems: "center",

    marginBottom: 24,
  },

  greeting: {
    color: "#93c5fd",

    fontSize: 13,
  },

  name: {
    color: "#fff",

    fontSize: 26,

    fontWeight: "800",

    marginTop: 3,
  },

  badgeRow: {
    flexDirection: "row",

    marginTop: 8,
  },

  badge: {
    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 10,

    paddingVertical: 4,

    borderRadius: 20,

    marginRight: 8,

    backgroundColor: "rgba(96,165,250,0.12)",
  },

  badgeText: {
    color: "#93c5fd",

    fontSize: 11,

    marginLeft: 4,
  },

  notificationButton: {
    width: 46,

    height: 46,

    borderRadius: 23,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.08)",
  },

  notificationDot: {
    width: 9,

    height: 9,

    borderRadius: 9,

    backgroundColor: "#ef4444",

    position: "absolute",

    top: 9,

    right: 9,
  },

  statusBanner: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    padding: 20,

    borderRadius: 20,

    marginBottom: 18,
  },

  statusLeft: {
    flexDirection: "row",

    alignItems: "center",
  },

  statusDot: {
    width: 10,

    height: 10,

    borderRadius: 10,

    marginRight: 14,
  },

  statusTitle: {
    color: "rgba(255,255,255,0.6)",

    fontSize: 12,
  },

  statusValue: {
    color: "#fff",

    fontSize: 18,

    fontWeight: "800",
  },

  statusTime: {
    color: "rgba(255,255,255,0.5)",

    fontSize: 12,

    marginTop: 4,
  },

  attendanceButton: {
    height: 58,

    borderRadius: 20,

    marginBottom: 18,

    justifyContent: "center",

    alignItems: "center",

    flexDirection: "row",
  },

  attendanceText: {
    color: "#fff",

    fontWeight: "700",

    marginLeft: 10,

    fontSize: 15,
  },

  card: {
    padding: 18,

    borderRadius: 22,

    marginBottom: 16,

    backgroundColor: "rgba(255,255,255,0.05)",
  },

  cardTitle: {
    color: "#fff",

    fontSize: 15,

    fontWeight: "700",

    marginBottom: 16,
  },

  monthlyGrid: {
    flexDirection: "row",
  },

  monthCard: {
    flex: 1,

    paddingVertical: 18,

    borderRadius: 16,

    marginHorizontal: 4,

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.06)",
  },

  monthValue: {
    color: "#fff",

    fontSize: 22,

    fontWeight: "800",
  },

  monthLabel: {
    color: "rgba(255,255,255,0.6)",

    marginTop: 6,

    fontSize: 11,
  },

  attendanceRow: {
    flexDirection: "row",

    alignItems: "center",

    paddingVertical: 10,
  },

  dayBadge: {
    width: 44,

    height: 44,

    borderRadius: 14,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "rgba(59,130,246,0.15)",
  },

  dayBadgeText: {
    color: "#60a5fa",

    fontWeight: "800",

    fontSize: 13,
  },

  timeText: {
    color: "#fff",

    fontSize: 13,

    fontWeight: "600",
  },

  presentText: {
    color: "#4ade80",

    fontSize: 11,

    marginTop: 4,
  },

  hoursBadge: {
    paddingHorizontal: 12,

    paddingVertical: 7,

    borderRadius: 12,

    backgroundColor: "rgba(59,130,246,0.12)",
  },

  hoursText: {
    color: "#60a5fa",

    fontWeight: "800",
  },

  divider: {
    height: 1,

    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
