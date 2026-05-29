// src/navigation/AdminTabs.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import AdminHomeScreen from "../screens/admin/home/AdminHomeScreen";
import EmployeesScreen from "../screens/admin/employees/EmployeesScreen";
import ReportsScreen from "../screens/admin/reports/ReportsScreen";
import AdminSettingsScreen from "../screens/admin/settings/AdminSettingsScreen";
import AdminCalendarScreen from "../screens/admin/calendar/AdminCalendarScreen";
// ✅ Correct import
import AdminBroadcastScreen from "../screens/admin/broadcasts/AdminBroadcastScreen";
import { APP_COLORS } from "../theme/appTheme";

const Tab = createBottomTabNavigator();

function TabBarIcon({ focused, icon, type }: any) {
  return (
    <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
      {type === "Ionicons" && (
        <Ionicons
          name={icon}
          size={22}
          color={focused ? APP_COLORS.white : "#dbeafe"}
        />
      )}
      {type === "Feather" && (
        <Feather
          name={icon}
          size={22}
          color={focused ? APP_COLORS.white : "#dbeafe"}
        />
      )}
      {type === "MaterialIcons" && (
        <MaterialIcons
          name={icon}
          size={22}
          color={focused ? APP_COLORS.white : "#dbeafe"}
        />
      )}
    </View>
  );
}

export default function AdminTabs() {
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
      <Tab.Screen
        name="Dashboard"
        component={AdminHomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} icon="grid-outline" type="Ionicons" />
          ),
        }}
      />
      <Tab.Screen
        name="Employees"
        component={EmployeesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} icon="users" type="Feather" />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={AdminCalendarScreen}
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
      <Tab.Screen
        name="Announcements"
        component={AdminBroadcastScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              icon="megaphone-outline"
              type="Ionicons"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} icon="bar-chart" type="Feather" />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={AdminSettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} icon="settings" type="Feather" />
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 12,
  },
});
