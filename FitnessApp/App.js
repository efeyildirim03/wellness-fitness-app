import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./src/config/firebase";
import { ActivityIndicator, View, Text } from "react-native";

import LoginScreen from "./src/screens/auth/LoginScreen";
import RegisterScreen from "./src/screens/auth/RegisterScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import WorkoutScreen from "./src/screens/WorkoutScreen";
import MealScreen from "./src/screens/MealScreen";
import MoodScreen from "./src/screens/MoodScreen";
import GoalsScreen from "./src/screens/GoalsScreen";
import RecommendationsScreen from "./src/screens/RecommendationsScreen";
import ProgressScreen from "./src/screens/ProgressScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ServerStatus from "./src/components/ServerStatus";

const Stack = createStackNavigator();

function AppStack() {
  return (
    <View style={{ flex: 1 }}>
      <ServerStatus />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#2E7D5E" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
          headerBackTitle: "Home",
        }}
      >
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Workout"
          component={WorkoutScreen}
          options={{ title: "💪 Log Workout" }}
        />
        <Stack.Screen
          name="Meals"
          component={MealScreen}
          options={{ title: "🥗 Log Meal" }}
        />
        <Stack.Screen
          name="Mood"
          component={MoodScreen}
          options={{ title: "😊 Mood & Wellness" }}
        />
        <Stack.Screen
          name="Goals"
          component={GoalsScreen}
          options={{ title: "🎯 My Goals" }}
        />
        <Stack.Screen
          name="Tips"
          component={RecommendationsScreen}
          options={{ title: "💡 Smart Tips" }}
        />
        <Stack.Screen
          name="Progress"
          component={ProgressScreen}
          options={{ title: "📈 Progress Report" }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: "👤 My Profile" }}
        />
      </Stack.Navigator>
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setOnboardingDone(userSnap.data().onboardingDone || false);
          } else {
            setOnboardingDone(false);
          }
        } catch (e) {
          setOnboardingDone(false);
        }
      } else {
        setUser(null);
        setOnboardingDone(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8FAF9",
        }}
      >
        <Text style={{ fontSize: 48, marginBottom: 16 }}>💪</Text>
        <Text
          style={{
            color: "#2E7D5E",
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 8,
          }}
        >
          Wellness & Fitness
        </Text>
        <Text style={{ color: "#6B8F71", fontSize: 14, marginBottom: 32 }}>
          Your holistic wellness companion
        </Text>
        <ActivityIndicator size="large" color="#2E7D5E" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !onboardingDone ? (
          <Stack.Screen name="Onboarding">
            {(props) => (
              <OnboardingScreen
                {...props}
                onComplete={() => setOnboardingDone(true)}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="App" component={AppStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
