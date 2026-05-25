import React from "react";

import { StyleSheet, ViewStyle } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

interface Props {
  children: React.ReactNode;

  style?: ViewStyle;
}

export default function GradientScreen({ children, style }: Props) {
  return (
    <LinearGradient
      colors={["#071226", "#0f1f3d", "#163a72", "#1d4ed8"]}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
