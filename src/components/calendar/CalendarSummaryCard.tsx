import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CalculatedPayrollSummary } from "../../types/calendar";

export default React.memo(function CalendarSummaryCard({
  stats,
}: {
  stats: CalculatedPayrollSummary;
}) {
  const fields = [
    {
      label: "Payroll Working Days",
      value: stats.workingDays,
      colors: ["rgba(96,165,250,0.12)", "transparent"],
      txtColor: "#60a5fa",
    },
    {
      label: "Actual Attendance %",
      value: `${styles ? stats.attendanceRate : 0}%`,
      colors: ["rgba(167,139,250,0.12)", "transparent"],
      txtColor: "#a78bfa",
    },
    {
      label: "Days Present",
      value: stats.present + stats.late,
      colors: ["rgba(74,222,128,0.12)", "transparent"],
      txtColor: "#4ade80",
    },
    {
      label: "Absent Slips",
      value: stats.absent,
      colors: ["rgba(248,113,113,0.12)", "transparent"],
      txtColor: "#f87171",
    },
  ];

  return (
    <View style={styles.statsGrid}>
      {fields.map((f, idx) => (
        <View key={idx} style={styles.kpiCard}>
          <LinearGradient
            colors={f.colors as any}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <Text style={styles.kpiLabel}>{f.label}</Text>
          <Text style={[styles.kpiValue, { color: f.txtColor }]}>
            {f.value}
          </Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginVertical: 14,
  },
  kpiCard: {
    width: "48%",
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
    minHeight: 90,
    justifyContent: "center",
  },
  kpiLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: { fontSize: 24, fontWeight: "900", marginTop: 4 },
});
