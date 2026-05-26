import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import GradientScreen from "../../../components/layout/GradientScreen";
import CalendarLegend from "../../../components/calendar/CalendarLegend";
import { supabase } from "../../../services/supabase";
import {
  buildUnifiedMarkedDatesMatrix,
  fetchGoogleHolidaysForYear,
} from "../../../services/calendarEngine";

const DEPARTMENTS = ["All", "Engineering", "Finance", "HR", "Sales", "IT"];

export default function AdminCalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("All");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [googleHolidays, setGoogleHolidays] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);

  const fetchGlobalMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const liveGoogleHolidays = await fetchGoogleHolidaysForYear(currentYear);
      setGoogleHolidays(liveGoogleHolidays);

      const [attendanceRes, leavesRes] = await Promise.all([
        supabase.from("attendance").select("*, profiles(department)"),
        supabase
          .from("leave_requests")
          .select("*, profiles(department)")
          .eq("status", "Approved"),
      ]);

      setAllAttendance(attendanceRes.data || []);
      setAllLeaves(leavesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchGlobalMetrics();
  }, [fetchGlobalMetrics]);

  const filteredAttendance = useMemo(() => {
    if (selectedDept === "All") return allAttendance;
    return allAttendance.filter((a) => a.profiles?.department === selectedDept);
  }, [allAttendance, selectedDept]);

  const filteredLeaves = useMemo(() => {
    if (selectedDept === "All") return allLeaves;
    return allLeaves.filter((l) => l.profiles?.department === selectedDept);
  }, [allLeaves, selectedDept]);

  const aggregatedTeamMatrix = useMemo(() => {
    return buildUnifiedMarkedDatesMatrix(
      currentYear,
      currentMonth,
      filteredAttendance,
      googleHolidays,
      filteredLeaves,
      selectedDept === "HR" ? ["Sunday"] : ["Saturday", "Sunday"],
    );
  }, [
    currentYear,
    currentMonth,
    filteredAttendance,
    googleHolidays,
    filteredLeaves,
    selectedDept,
  ]);

  return (
    <GradientScreen>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerEyebrow}>Enterprise Cloud Core</Text>
            <Text style={styles.headerTitle}>Team Dashboard</Text>
          </View>
        </View>

        <View style={{ maxHeight: 50, marginBottom: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {DEPARTMENTS.map((dept) => {
              const isCurrent = selectedDept === dept;
              return (
                <TouchableOpacity
                  key={dept}
                  style={[styles.chip, isCurrent && styles.chipActive]}
                  onPress={() => setSelectedDept(dept)}
                >
                  <Text
                    style={[styles.chipText, isCurrent && { color: "#fff" }]}
                  >
                    {dept}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            <View style={styles.calendarCardWrap}>
              <Calendar
                theme={calendarTheme}
                markingType="custom"
                markedDates={aggregatedTeamMatrix}
                onMonthChange={(monthObj) => {
                  setCurrentYear(monthObj.year);
                  setCurrentMonth(monthObj.month);
                }}
              />
            </View>
            <CalendarLegend />
          </ScrollView>
        )}
      </SafeAreaView>
    </GradientScreen>
  );
}

const calendarTheme = {
  backgroundColor: "transparent",
  calendarBackground: "transparent",
  textSectionTitleColor: "#475569",
  monthTextColor: "#f1f5f9",
  dayTextColor: "#94a3b8",
  arrowColor: "#3b82f6",
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerEyebrow: {
    color: "#1d4ed8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#f1f5f9",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
  },
  filterContainer: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#3b82f6" },
  chipText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  scrollBody: { paddingHorizontal: 18, paddingBottom: 40 },
  calendarCardWrap: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 8,
  },
  loaderCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
});
