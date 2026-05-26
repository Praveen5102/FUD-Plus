import React from "react";

import { View, StyleSheet } from "react-native";

import { BlurView } from "expo-blur";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import EmployeeHomeScreen from "../screens/employee/home/EmployeeHomeScreen";

import AttendanceHistoryScreen from "../screens/employee/history/AttendanceHistoryScreen";

import EmployeeProfileScreen from "../screens/employee/profile/EmployeeProfileScreen";

import EmployeeSettingsScreen from "../screens/employee/settings/EmployeeSettingsScreen";

import { COLORS } from "../constants/colors";
import EmployeeCalendarScreen from "../screens/employee/calendar/EmployeeCalendarScreen";

const Tab = createBottomTabNavigator();

function TabBarIcon({ focused, icon, type }: any) {
  return (
    <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
      {/* IONICONS */}

      {type === "Ionicons" && (
        <Ionicons
          name={icon}
          size={22}
          color={focused ? COLORS.white : "#dbeafe"}
        />
      )}

      {/* MATERIAL ICONS */}

      {type === "MaterialIcons" && (
        <MaterialIcons
          name={icon}
          size={22}
          color={focused ? COLORS.white : "#dbeafe"}
        />
      )}
    </View>
  );
}

export default function EmployeeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarShowLabel: false,

        tabBarStyle: {
          position: "absolute",

          bottom: 22,
          left: 20,
          right: 20,

          height: 78,

          borderTopWidth: 0,

          backgroundColor: "transparent",

          elevation: 0,
        },

        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={styles.blurContainer} />
        ),
      }}
    >
      {/* HOME */}

      <Tab.Screen
        name="Home"
        component={EmployeeHomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} icon="home-outline" type="Ionicons" />
          ),
        }}
      />

      {/* HISTORY */}

      <Tab.Screen
        name="History"
        component={AttendanceHistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} icon="history" type="MaterialIcons" />
          ),
        }}
      />
      <Tab.Screen
        name="EmployeeCalendarScreen"
        component={EmployeeCalendarScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              icon="calendar-outline"
              type="Ionicons"
            />
          ),
        }}
      />
      {/* PROFILE */}

      <Tab.Screen
        name="Profile"
        component={EmployeeProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              icon="person-outline"
              type="Ionicons"
            />
          ),
        }}
      />

      {/* SETTINGS */}

      <Tab.Screen
        name="Settings"
        component={EmployeeSettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              icon="settings-outline"
              type="Ionicons"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,

    borderRadius: 30,

    overflow: "hidden",

    backgroundColor: "rgba(255,255,255,0.08)",

    borderWidth: 1,

    borderColor: "rgba(255,255,255,0.08)",
  },

  iconContainer: {
    width: 52,
    height: 52,

    borderRadius: 18,

    justifyContent: "center",
    alignItems: "center",
  },

  activeIconContainer: {
    backgroundColor: "rgba(96,165,250,0.25)",

    borderWidth: 1,

    borderColor: "rgba(255,255,255,0.14)",

    shadowColor: "#60a5fa",

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.45,

    shadowRadius: 12,

    elevation: 12,
  },
});
