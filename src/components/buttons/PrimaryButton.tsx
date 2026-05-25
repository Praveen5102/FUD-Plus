import React from "react";

import { Pressable, StyleSheet, Text } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { COLORS } from "../../constants/colors";

interface Props {
  title: string;
  onPress?: () => void;
}

export default function PrimaryButton({ title, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={["#1e5fc4", "#3b82f6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,

    borderRadius: 16,

    justifyContent: "center",
    alignItems: "center",
  },

  text: {
    color: COLORS.white,

    fontSize: 16,
    fontWeight: "700",
  },
});
