import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default React.memo(function HolidayCard({ holiday }: { holiday: any }) {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.iconBlock}>
        <Ionicons name="flag-sharp" size={15} color="#60a5fa" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{holiday.title}</Text>
        <Text style={styles.subtitle}>
          {holiday.holiday_type || "Public"} Holiday
        </Text>
      </View>
      <Text style={styles.date}>
        {new Date(holiday.holiday_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 10,
  },
  iconBlock: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(96,165,250,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: { color: "#f1f5f9", fontSize: 14, fontWeight: "700" },
  subtitle: { color: "#64748b", fontSize: 11, fontWeight: "500", marginTop: 2 },
  date: { color: "#60a5fa", fontSize: 13, fontWeight: "800" },
});
