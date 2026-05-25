import React from "react";

import { StyleSheet, Text, View } from "react-native";

import { APP_COLORS } from "../../theme/appTheme";

interface Props {
  title: string;

  value: string;

  color?: string;
}

export default function AnalyticsCard({
  title,
  value,
  color = APP_COLORS.primary,
}: Props) {
  return (
    <View style={styles.card}>
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: color,
          },
        ]}
      />

      <Text style={styles.value}>{value}</Text>

      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,

    padding: 18,

    borderRadius: 22,

    marginHorizontal: 5,

    overflow: "hidden",

    backgroundColor: "rgba(255,255,255,0.08)",
  },

  topBar: {
    position: "absolute",

    top: 0,
    left: 0,
    right: 0,

    height: 4,
  },

  value: {
    color: APP_COLORS.white,

    fontSize: 24,
    fontWeight: "800",

    marginTop: 10,
  },

  title: {
    color: APP_COLORS.textLight,

    fontSize: 12,

    marginTop: 8,
  },
});
