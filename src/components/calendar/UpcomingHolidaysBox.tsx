import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default React.memo(function UpcomingHolidaysBox({
  holidays,
}: {
  holidays: any[];
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Upcoming Holidays</Text>
      <View style={styles.scrollBox}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {holidays.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming holidays.</Text>
          ) : (
            holidays.map((h, i) => (
              <View key={i} style={styles.holidayItem}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateDay}>
                    {new Date(h.holiday_date).getDate()}
                  </Text>
                  <Text style={styles.dateMonth}>
                    {new Date(h.holiday_date).toLocaleDateString("en-IN", {
                      month: "short",
                    })}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.holidayTitle}>{h.title}</Text>
                  <Text style={styles.holidayType}>{h.holiday_type}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginVertical: 14 },
  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  scrollBox: {
    height: 180,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  holidayItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  dateBadge: {
    backgroundColor: "rgba(96,165,250,0.1)",
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 12,
    minWidth: 45,
  },
  dateDay: { color: "#60a5fa", fontSize: 16, fontWeight: "900" },
  dateMonth: {
    color: "#60a5fa",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  holidayTitle: { color: "#f1f5f9", fontSize: 13, fontWeight: "700" },
  holidayType: { color: "#64748b", fontSize: 10, fontWeight: "600" },
  emptyText: {
    color: "#475569",
    textAlign: "center",
    marginTop: 60,
    fontStyle: "italic",
  },
});
