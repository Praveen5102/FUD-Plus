import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CALENDAR_COLORS } from "../../services/calendarEngine";

export default React.memo(function CalendarLegend() {
  return (
    <View style={styles.legendContainer}>
      {Object.values(CALENDAR_COLORS).map((item) => (
        <View key={item.label} style={styles.legendRow}>
          <View
            style={[
              styles.indicatorDot,
              { backgroundColor: item.bg, borderColor: item.color },
            ]}
          />
          <Text style={styles.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginVertical: 10,
    justifyContent: "space-between",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "30%",
    marginBottom: 4,
  },
  indicatorDot: { width: 10, height: 10, borderRadius: 4, borderWidth: 1 },
  legendText: { color: "#94a3b8", fontSize: 10, fontWeight: "600" },
});
