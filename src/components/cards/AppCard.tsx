import React from "react";

import { StyleSheet, View } from "react-native";

import { APP_COLORS, APP_RADIUS } from "../../theme/appTheme";

interface Props {
  children: React.ReactNode;
}

export default function AppCard({ children }: Props) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    padding: 18,

    borderRadius: APP_RADIUS.lg,

    backgroundColor: APP_COLORS.bgCard,

    borderWidth: 1,

    borderColor: APP_COLORS.border,
  },
});
