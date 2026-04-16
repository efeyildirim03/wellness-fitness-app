import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import WorkoutScreen from "../screens/WorkoutScreen";
import MealScreen from "../screens/MealScreen";
import MoodScreen from "../screens/MoodScreen";
import GoalsScreen from "../screens/GoalsScreen";
import RecommendationsScreen from "../screens/RecommendationsScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: "#1a1a2e" },
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "#888",
        headerStyle: { backgroundColor: "#1a1a2e" },
        headerTintColor: "#fff",
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: "🏠 Home" }}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutScreen}
        options={{ tabBarLabel: "💪 Workout" }}
      />
      <Tab.Screen
        name="Meals"
        component={MealScreen}
        options={{ tabBarLabel: "🥗 Meals" }}
      />
      <Tab.Screen
        name="Mood"
        component={MoodScreen}
        options={{ tabBarLabel: "😊 Mood" }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ tabBarLabel: "🎯 Goals" }}
      />
      <Tab.Screen
        name="Tips"
        component={RecommendationsScreen}
        options={{ tabBarLabel: "💡 Tips" }}
      />
    </Tab.Navigator>
  );
}

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
