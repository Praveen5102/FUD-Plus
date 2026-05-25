import React from "react";

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Feather, Ionicons } from "@expo/vector-icons";

import { APP_COLORS } from "../../theme/appTheme";

interface Props {
  title: string;

  subtitle?: string;

  showMenu?: boolean;
}

export default function AppHeader({
  title,
  subtitle,
  showMenu = false,
}: Props) {
  return (
    <View style={styles.container}>
      <View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        <Text style={styles.title}>{title}</Text>
      </View>

      <TouchableOpacity activeOpacity={0.8} style={styles.iconButton}>
        {showMenu ? (
          <Feather name="menu" size={22} color={APP_COLORS.white} />
        ) : (
          <Ionicons
            name="notifications-outline"
            size={22}
            color={APP_COLORS.white}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 24,
  },

  subtitle: {
    color: APP_COLORS.textLight,

    fontSize: 13,
  },

  title: {
    color: APP_COLORS.white,

    fontSize: 26,
    fontWeight: "800",

    marginTop: 4,
  },

  iconButton: {
    width: 48,
    height: 48,

    borderRadius: 18,

    justifyContent: "center",
    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.08)",
  },
});
