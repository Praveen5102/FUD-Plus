// components/ui/NotificationBell.tsx
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface Props {
  unreadCount: number;
}

export default function NotificationBell({ unreadCount }: Props) {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={() => navigation.navigate("Notifications")}
      activeOpacity={0.8}
    >
      <Ionicons name="notifications-outline" size={21} color="#fff" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#020617",
  },
  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
    lineHeight: 10,
  },
});
