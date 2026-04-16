import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { useNavigation } from "@react-navigation/native";
import { FLASK_URL } from "../config/api";
import { theme } from "../config/theme";

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [userName, setUserName] = useState("");
  const [todayWorkouts, setTodayWorkouts] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayMood, setTodayMood] = useState("");
  const [motivationalMsg, setMotivationalMsg] = useState("");
  const [greeting, setGreeting] = useState("");
  const [tone, setTone] = useState("general");
  const [loadingMotivation, setLoadingMotivation] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({
    workoutCount: 0,
    avgMoodScore: 3,
    stressLevel: "Low",
    sleepQuality: "Good",
    activeGoals: [],
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    fetchUserData();
    fetchTodayStats();
    fetchWeeklyDataAndMotivation();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        setUserName(userSnap.data().name || "User");
      }
    } catch (error) {
      console.log("fetchUserData error:", error.code);
    }
  };

  const fetchTodayStats = async () => {
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

      setTodayWorkouts(workoutSnap.size);
      let totalCal = 0;
      mealSnap.forEach((doc) => (totalCal += doc.data().calories_intake || 0));
      setTodayCalories(Math.round(totalCal));
      if (!moodSnap.empty) {
        setTodayMood(moodSnap.docs[0].data().mood_level || "");
      }
    } catch (error) {
      console.log("fetchTodayStats error:", error.code);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchWeeklyDataAndMotivation = async () => {
    setLoadingMotivation(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const [workoutSnap, moodSnap, mealSnap, goalSnap] = await Promise.all([
        getDocs(
          query(collection(db, "workouts"), where("user_id", "==", user.uid)),
        ),
        getDocs(
          query(collection(db, "moods"), where("user_id", "==", user.uid)),
        ),
        getDocs(
          query(collection(db, "meals"), where("user_id", "==", user.uid)),
        ),
        getDocs(
          query(
            collection(db, "goals"),
            where("user_id", "==", user.uid),
            where("status", "==", "active"),
          ),
        ),
      ]);

      const allWorkouts = workoutSnap.docs.map((d) => d.data());
      const workouts = allWorkouts.filter((w) => w.date >= weekAgo);
      const allMoods = moodSnap.docs.map((d) => d.data());
      const moods = allMoods.filter((m) => m.date >= weekAgo);
      const allMeals = mealSnap.docs.map((d) => d.data());
      const meals = allMeals.filter((m) => m.date >= weekAgo);
      const goals = goalSnap.docs.map((d) => d.data());

      const allWorkoutDates = [...new Set(allWorkouts.map((w) => w.date))]
        .sort()
        .reverse();
      let currentStreak = 0;
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        if (allWorkoutDates.includes(checkDate)) {
          currentStreak++;
        } else if (i > 0) break;
      }
      setStreak(currentStreak);

      const earned = [];
      if (currentStreak >= 3)
        earned.push({
          icon: "🔥",
          title: `${currentStreak} Day Streak!`,
          color: "#FF9800",
        });
      if (workouts.length >= 5)
        earned.push({ icon: "🏆", title: "Workout Warrior", color: "#FFD700" });
      const totalCalBurned = workouts.reduce(
        (a, w) => a + (w.calories_burned || 0),
        0,
      );
      if (totalCalBurned >= 500)
        earned.push({ icon: "⚡", title: "Calorie Crusher", color: "#52B788" });
      if (meals.length >= 10)
        earned.push({
          icon: "🥗",
          title: "Nutrition Tracker",
          color: "#2E7D5E",
        });
      if (moods.length >= 5)
        earned.push({ icon: "😊", title: "Self Aware", color: "#6B8F71" });
      const avgMood =
        moods.length > 0
          ? moods.reduce((a, m) => a + (m.mood_score || 3), 0) / moods.length
          : 0;
      if (avgMood >= 4)
        earned.push({ icon: "🌟", title: "Positive Vibes", color: "#52B788" });
      setAchievements(earned);

      const avgMoodScore =
        moods.length > 0
          ? moods.reduce((a, m) => a + (m.mood_score || 3), 0) / moods.length
          : 3;
      const latestMood = moods.length > 0 ? moods[moods.length - 1] : {};

      const stats = {
        workoutCount: workouts.length,
        avgMoodScore: avgMoodScore.toFixed(1),
        stressLevel: latestMood.stress_level || "Low",
        sleepQuality: latestMood.sleep_quality || "Good",
        activeGoals: goals.map((g) => g.goal_type),
      };
      setWeeklyStats(stats);

      try {
        const response = await fetch(`${FLASK_URL}/api/motivation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stats),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setMotivationalMsg(result.data.message);
            setGreeting(result.data.greeting);
            setTone(result.data.tone);
          }
        }
      } catch {
        const fallbacks = [
          "Every workout brings you closer to your goal! 💪",
          "Small steps every day lead to big results! 🚀",
          "You're stronger than you think! ⚡",
          "Consistency is the key to success! 🔑",
        ];
        setMotivationalMsg(
          fallbacks[Math.floor(Math.random() * fallbacks.length)],
        );
        setGreeting("Hello! 👋");
      }
    } catch (error) {
      console.log("fetchWeeklyData error:", error.code);
    } finally {
      setLoadingMotivation(false);
    }
  };

  const getToneStyle = () => {
    switch (tone) {
      case "energetic":
        return {
          bg: "#D8F3DC",
          border: theme.colors.primary,
          label: "⚡ Keep Going!",
        };
      case "supportive":
        return { bg: "#E3F2FD", border: "#2196F3", label: "💙 We've Got You!" };
      case "gentle":
        return { bg: "#F3E5F5", border: "#9C27B0", label: "🌸 Take It Easy" };
      default:
        return {
          bg: "#FFF8E1",
          border: "#FF9800",
          label: "💡 Daily Motivation",
        };
    }
  };

  const toneStyle = getToneStyle();

  const quickActions = [
    {
      icon: "💪",
      label: "Log Workout",
      color: theme.colors.primary,
      bg: theme.colors.primaryUltraLight,
      screen: "Workout",
    },
    {
      icon: "🥗",
      label: "Log Meal",
      color: "#2196F3",
      bg: "#E3F2FD",
      screen: "Meals",
    },
    {
      icon: "😊",
      label: "Log Mood",
      color: "#FF9800",
      bg: "#FFF8E1",
      screen: "Mood",
    },
    {
      icon: "🎯",
      label: "My Goals",
      color: "#9C27B0",
      bg: "#F3E5F5",
      screen: "Goals",
    },
    {
      icon: "💡",
      label: "Get Tips",
      color: "#E76F51",
      bg: "#FDE8E4",
      screen: "Tips",
    },
    {
      icon: "📈",
      label: "Progress",
      color: "#00ACC1",
      bg: "#E0F7FA",
      screen: "Progress",
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── 1. HEADER ── */}
      <View style={styles.headerBg}>
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>
              {greeting || "Hello there! 👋"}
            </Text>
            <Text style={styles.userName}>{userName || "User"}</Text>
            <Text style={styles.dateText}>{new Date().toDateString()}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={styles.profileIconBtn}
          >
            <View style={styles.profileIconCircle}>
              <Text style={styles.profileIconText}>
                {userName ? userName.charAt(0).toUpperCase() : "👤"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. MOTIVATIONAL CARD ── */}
      <View
        style={[
          styles.motivationCard,
          {
            backgroundColor: toneStyle.bg,
            borderLeftColor: toneStyle.border,
          },
        ]}
      >
        {loadingMotivation ? (
          <ActivityIndicator color={theme.colors.primary} size="small" />
        ) : (
          <>
            <Text style={[styles.motivationLabel, { color: toneStyle.border }]}>
              {toneStyle.label}
            </Text>
            <Text style={styles.motivationText}>{motivationalMsg}</Text>
          </>
        )}
      </View>

      {/* ── 3. QUICK ACTIONS (moved up) ── */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.actionCard, { backgroundColor: item.bg }]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.actionIconBg,
                { backgroundColor: item.color + "25" },
              ]}
            >
              <Text style={styles.actionIcon}>{item.icon}</Text>
            </View>
            <Text style={[styles.actionLabel, { color: item.color }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 4. TODAY'S SUMMARY ── */}
      <Text style={styles.sectionTitle}>Today's Summary</Text>
      {loadingStats ? (
        <ActivityIndicator
          color={theme.colors.primary}
          style={{ marginVertical: 16 }}
        />
      ) : (
        <View style={styles.statsRow}>
          {[
            {
              icon: "💪",
              value: todayWorkouts,
              label: "Workouts",
              bg: theme.colors.primaryUltraLight,
            },
            {
              icon: "🔥",
              value: todayCalories,
              label: "Calories",
              bg: "#E3F2FD",
            },
            {
              icon: "😊",
              value: todayMood || "—",
              label: "Mood",
              bg: "#FFF8E1",
            },
          ].map((item, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: item.bg }]}>
                <Text style={styles.statIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── 5. WEEKLY STATS ── */}
      <Text style={styles.sectionTitle}>This Week</Text>
      <View style={styles.weeklyCard}>
        {streak > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakFire}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakText}>
                {streak} Day Workout Streak!
              </Text>
              <Text style={styles.streakSub}>
                Keep it going — don't break the chain!
              </Text>
            </View>
          </View>
        )}
        <View style={styles.weeklyGrid}>
          {[
            { label: "Workouts", value: weeklyStats.workoutCount, icon: "💪" },
            { label: "Avg Mood", value: weeklyStats.avgMoodScore, icon: "😊" },
            { label: "Stress", value: weeklyStats.stressLevel, icon: "🧘" },
            { label: "Sleep", value: weeklyStats.sleepQuality, icon: "😴" },
          ].map((item, i) => (
            <View key={i} style={styles.weeklyItem}>
              <Text style={styles.weeklyItemIcon}>{item.icon}</Text>
              <Text style={styles.weeklyValue}>{item.value}</Text>
              <Text style={styles.weeklyLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── 6. ACHIEVEMENTS ── */}
      {achievements.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🏅 This Week's Achievements</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.achievementsRow}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {achievements.map((a, i) => (
              <View
                key={i}
                style={[styles.achievementBadge, { borderColor: a.color }]}
              >
                <Text style={styles.achievementIcon}>{a.icon}</Text>
                <Text style={[styles.achievementTitle, { color: a.color }]}>
                  {a.title}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: { marginBottom: 8 },
  headerBg: {
    backgroundColor: theme.colors.primary,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    paddingTop: 48,
  },
  greetingText: {
    fontSize: 14,
    color: theme.colors.primaryPastel,
    fontWeight: "500",
  },
  userName: { fontSize: 26, fontWeight: "700", color: "#fff", marginTop: 2 },
  dateText: { fontSize: 12, color: theme.colors.primaryPastel, marginTop: 4 },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoutText: { color: "#fff", fontWeight: "600", fontSize: 13 },

  motivationCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    minHeight: 72,
    justifyContent: "center",
    ...theme.shadow.small,
  },
  motivationLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  motivationText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: "italic",
  },

  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 12,
  },

  statsRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 8 },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    alignItems: "center",
    marginRight: 8,
    ...theme.shadow.small,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: "700", color: theme.colors.primary },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },

  weeklyCard: {
    marginHorizontal: 16,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 8,
    ...theme.shadow.small,
  },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#FF9800",
  },
  streakFire: { fontSize: 28, marginRight: 10 },
  streakText: { color: "#E65100", fontWeight: "700", fontSize: 15 },
  streakSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  weeklyGrid: { flexDirection: "row", justifyContent: "space-between" },
  weeklyItem: { alignItems: "center", flex: 1 },
  weeklyItemIcon: { fontSize: 20, marginBottom: 4 },
  weeklyValue: { color: theme.colors.primary, fontWeight: "700", fontSize: 15 },
  weeklyLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  achievementsRow: { paddingLeft: 16, marginBottom: 8 },
  achievementBadge: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1.5,
    minWidth: 100,
    ...theme.shadow.small,
  },
  achievementIcon: { fontSize: 28, marginBottom: 6 },
  achievementTitle: { fontWeight: "700", fontSize: 11, textAlign: "center" },

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  actionCard: {
    width: "47%",
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginRight: 8,
    marginBottom: 8,
    alignItems: "center",
    ...theme.shadow.small,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: { fontWeight: "700", fontSize: 13, textAlign: "center" },
  profileIconBtn: { marginLeft: 12 },
  profileIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  profileIconText: { color: "#fff", fontSize: 20, fontWeight: "700" },
});
