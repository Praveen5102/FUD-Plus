import React from "react";

import { StyleSheet, TextInput, TextInputProps, View } from "react-native";

import { COLORS } from "../../constants/colors";

interface Props extends TextInputProps {}

export default function AppInput({ ...props }: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        placeholderTextColor={COLORS.textDim}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 18,
  },

  input: {
    height: 58,

    borderRadius: 16,

    paddingHorizontal: 18,

    backgroundColor: "rgba(255,255,255,0.06)",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",

    color: COLORS.white,

    fontSize: 15,
    fontWeight: "500",
  },
});
