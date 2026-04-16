import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../config/theme";

export default function TrackScreen() {
  const navigation = useNavigation();
  const [todayStatus, setTodayStatus] = useState({
    workout: false,
    meal: false,
    mood: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTodayStatus();
  }, []);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      checkTodayStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const checkTodayStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];

      const [workoutSnap, mealSnap, moodSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "workouts"),
            where("user_id", "==", user.uid),
            where("date", "==", today),
          ),
        ),
        getDocs(
          query(
            collection(db, "meals"),
            where("user_id", "==", user.uid),
            where("date", "==", today),
          ),
        ),
        getDocs(
          query(
            collection(db, "moods"),
            where("user_id", "==", user.uid),
            where("date", "==", today),
          ),
        ),
      ]);

      setTodayStatus({
        workout: workoutSnap.size > 0,
        meal: mealSnap.size > 0,
        mood: moodSnap.size > 0,
      });
    } catch (error) {
      console.log("checkTodayStatus error:", error.code);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = Object.values(todayStatus).filter(Boolean).length;
  const progressPercent = (completedCount / 3) * 100;

  const trackItems = [
    {
      icon: "💪",
      title: "Log Workout",
      subtitle: "Track your exercise session",
      screen: "Workout",
      done: todayStatus.workout,
      color: theme.colors.primary,
      bg: theme.colors.primaryUltraLight,
      doneText: "Workout logged today ✓",
    },
    {
      icon: "🥗",
      title: "Log Meal",
      subtitle: "Track what you ate today",
      screen: "Meals",
      done: todayStatus.meal,
      color: "#2196F3",
      bg: "#E3F2FD",
      doneText: "Meal logged today ✓",
    },
    {
      icon: "😊",
      title: "Log Mood",
      subtitle: "How are you feeling today?",
      screen: "Mood",
      done: todayStatus.mood,
      color: "#FF9800",
      bg: "#FFF8E1",
      doneText: "Mood logged today ✓",
    },
  ];

  const extraItems = [
    {
      icon: "🎯",
      title: "My Goals",
      subtitle: "View and manage your goals",
      screen: "Goals",
      color: "#9C27B0",
      bg: "#F3E5F5",
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Tracker</Text>
        <Text style={styles.subtitle}>{new Date().toDateString()}</Text>
      </View>

      {/* Daily Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressSubtitle}>
              {completedCount === 3
                ? "🎉 All done for today!"
                : `${completedCount}/3 activities logged`}
            </Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressCircleText}>{completedCount}/3</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
          />
        </View>
        {completedCount === 3 && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedBannerText}>
              🌟 Amazing! You've completed all daily activities. Check your Tips
              for personalized recommendations!
            </Text>
          </View>
        )}
      </View>

      {/* Daily Tracking Items */}
      <Text style={styles.sectionLabel}>Daily Activities</Text>
      {trackItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.trackCard,
            item.done && styles.trackCardDone,
            { borderLeftColor: item.color },
          ]}
          onPress={() => navigation.navigate(item.screen)}
          activeOpacity={0.7}
        >
          <View style={[styles.trackIconBg, { backgroundColor: item.bg }]}>
            <Text style={styles.trackIcon}>{item.icon}</Text>
          </View>
          <View style={styles.trackContent}>
            <Text
              style={[styles.trackTitle, item.done && styles.trackTitleDone]}
            >
              {item.title}
            </Text>
            <Text style={styles.trackSubtitle}>
              {item.done ? item.doneText : item.subtitle}
            </Text>
          </View>
          <View
            style={[
              styles.trackStatus,
              {
                backgroundColor: item.done ? item.bg : theme.colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.trackStatusText,
                { color: item.done ? item.color : theme.colors.textMuted },
              ]}
            >
              {item.done ? "✓" : "→"}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Extra */}
      <Text style={styles.sectionLabel}>More</Text>
      {extraItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.trackCard, { borderLeftColor: item.color }]}
          onPress={() => navigation.navigate(item.screen)}
          activeOpacity={0.7}
        >
          <View style={[styles.trackIconBg, { backgroundColor: item.bg }]}>
            <Text style={styles.trackIcon}>{item.icon}</Text>
          </View>
          <View style={styles.trackContent}>
            <Text style={styles.trackTitle}>{item.title}</Text>
            <Text style={styles.trackSubtitle}>{item.subtitle}</Text>
          </View>
          <View
            style={[
              styles.trackStatus,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Text
              style={[
                styles.trackStatusText,
                { color: theme.colors.textMuted },
              ]}
            >
              →
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Go Home */}
      <TouchableOpacity
        style={styles.homeBtn}
        onPress={() => navigation.navigate("Dashboard")}
      >
        <Text style={styles.homeBtnText}>🏠 Back to Home</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    backgroundColor: theme.colors.primary,
    padding: 24,
    paddingTop: 32,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: 14, color: theme.colors.primaryPastel, marginTop: 4 },

  progressCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    ...theme.shadow.medium,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  progressSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryUltraLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  progressCircleText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  completedBanner: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  completedBannerText: {
    color: theme.colors.primary,
    fontSize: 13,
    lineHeight: 20,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginLeft: 16,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  trackCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderLeftWidth: 4,
    ...theme.shadow.small,
  },
  trackCardDone: { opacity: 0.85 },
  trackIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  trackIcon: { fontSize: 26 },
  trackContent: { flex: 1 },
  trackTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  trackTitleDone: { color: theme.colors.textSecondary },
  trackSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  trackStatus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  trackStatusText: { fontSize: 18, fontWeight: "700" },

  homeBtn: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    ...theme.shadow.small,
  },
  homeBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 14,
  },
});
