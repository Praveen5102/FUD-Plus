import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import GradientScreen from "../../../components/layout/GradientScreen";
import CalendarLegend from "../../../components/calendar/CalendarLegend";
import CalendarSummaryCard from "../../../components/calendar/CalendarSummaryCard";
import HolidayCard from "../../../components/calendar/HolidayCard";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../services/supabase";
import {
  buildUnifiedMarkedDatesMatrix,
  fetchGoogleHolidaysForYear,
} from "../../../services/calendarEngine";
import { CalculatedPayrollSummary } from "../../../types/calendar";

export default function EmployeeCalendarScreen() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  const [attendance, setAttendance] = useState<any[]>([]);
  const [googleHolidays, setGoogleHolidays] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [weekoffRule, setWeekoffRule] = useState<string[]>(["Sunday"]);

  const syncHRDataAndGoogleCalendar = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const liveGoogleHolidays = await fetchGoogleHolidaysForYear(currentYear);
      setGoogleHolidays(liveGoogleHolidays);

      const [attendanceRes, leavesRes, weekoffsRes] = await Promise.all([
        supabase.from("attendance").select("*").eq("employee_id", user.id),
        supabase
          .from("leave_requests")
          .select("*")
          .eq("employee_id", user.id)
          .eq("status", "Approved"),
        supabase
          .from("department_weekoffs")
          .select("weekoff_days")
          .eq("department", profile?.department || "IT")
          .single(),
      ]);

      setAttendance(attendanceRes.data || []);
      setLeaves(leavesRes.data || []);
      if (weekoffsRes.data) setWeekoffRule(weekoffsRes.data.weekoff_days);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentYear, user, profile]);

  useEffect(() => {
    syncHRDataAndGoogleCalendar();

    const realTimeChannel = supabase
      .channel("employee-calendar-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => syncHRDataAndGoogleCalendar(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leave_requests" },
        () => syncHRDataAndGoogleCalendar(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realTimeChannel);
    };
  }, [syncHRDataAndGoogleCalendar]);

  const markedDatesMatrix = useMemo(() => {
    return buildUnifiedMarkedDatesMatrix(
      currentYear,
      currentMonth,
      attendance,
      googleHolidays,
      leaves,
      weekoffRule,
    );
  }, [
    currentYear,
    currentMonth,
    attendance,
    googleHolidays,
    leaves,
    weekoffRule,
  ]);

  const currentMonthHolidays = useMemo(() => {
    return googleHolidays.filter((h) => {
      const d = new Date(h.holiday_date);
      return (
        d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
      );
    });
  }, [googleHolidays, currentYear, currentMonth]);

  const computedMonthlyPayrollStats: CalculatedPayrollSummary = useMemo(() => {
    let present = 0,
      late = 0,
      halfDay = 0,
      absent = 0;

    attendance.forEach((rec) => {
      const recDate = new Date(rec.attendance_date);
      if (
        recDate.getFullYear() === currentYear &&
        recDate.getMonth() + 1 === currentMonth
      ) {
        if (rec.work_status === "Present") present++;
        if (rec.work_status === "Late") late++;
        if (rec.work_status === "Half Day") halfDay++;
        if (rec.work_status === "Absent") absent++;
      }
    });

    const netActiveDaysInMonth = Object.keys(markedDatesMatrix).length;
    let weekoffs = 0,
      holidaysCount = 0,
      leavesCount = 0;

    Object.values(markedDatesMatrix).forEach((day: any) => {
      if (day.meta?.label === "Weekoff") weekoffs++;
      if (day.meta?.label === "Holiday") holidaysCount++;
      if (day.meta?.label === "Approved Leave") leavesCount++;
    });

    const calculatedWorkingDays =
      netActiveDaysInMonth - weekoffs - holidaysCount;
    const directAttendancePunches = present + late + halfDay * 0.5;
    const calculatedRate =
      calculatedWorkingDays > 0
        ? Math.round((directAttendancePunches / calculatedWorkingDays) * 100)
        : 0;

    return {
      totalDays: netActiveDaysInMonth,
      weekoffs,
      holidays: holidaysCount,
      approvedLeaves: leavesCount,
      workingDays: calculatedWorkingDays,
      present,
      late,
      halfDay,
      absent,
      attendanceRate: Math.min(100, calculatedRate),
    };
  }, [markedDatesMatrix, attendance, currentYear, currentMonth]);

  return (
    <GradientScreen>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>Live Google Integration</Text>
          <Text style={styles.headerTitle}>HR Calendar</Text>
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
                markedDates={markedDatesMatrix}
                onMonthChange={(monthObj) => {
                  setCurrentYear(monthObj.year);
                  setCurrentMonth(monthObj.month);
                }}
              />
            </View>

            <CalendarLegend />

            <Text style={styles.sectionTitle}>Monthly Overview</Text>
            <CalendarSummaryCard stats={computedMonthlyPayrollStats} />

            <Text style={styles.sectionTitle}>Google Calendar Holidays</Text>
            {currentMonthHolidays.length === 0 ? (
              <Text style={styles.emptyText}>
                No public holidays this month.
              </Text>
            ) : (
              currentMonthHolidays.map((item) => (
                <HolidayCard key={item.id} holiday={item} />
              ))
            )}
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
  todayTextColor: "#3b82f6",
  dayTextColor: "#94a3b8",
  textDisabledColor: "#334155",
  arrowColor: "#3b82f6",
  monthTextColor: "#f1f5f9",
  textDayFontWeight: "600",
  textMonthFontWeight: "900",
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  headerEyebrow: {
    color: "#1d4ed8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#f1f5f9",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  scrollBody: { paddingHorizontal: 18, paddingBottom: 40 },
  calendarCardWrap: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 10,
  },
  emptyText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
    fontStyle: "italic",
  },
  loaderCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
});
