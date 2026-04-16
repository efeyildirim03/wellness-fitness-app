import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { FLASK_URL } from "../config/api";
import { theme } from "../config/theme";

export default function RecommendationsScreen() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [savedRecs, setSavedRecs] = useState([]);
  const [userData, setUserData] = useState(null);
  const [fetchingData, setFetchingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchUserSummary();
    fetchSavedRecommendations();
  }, []);

  const fetchUserSummary = async () => {
    setFetchingData(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const [workoutSnap, mealSnap, moodSnap, goalSnap] = await Promise.all([
        getDocs(
          query(collection(db, "workouts"), where("user_id", "==", user.uid)),
        ),
        getDocs(
          query(collection(db, "meals"), where("user_id", "==", user.uid)),
        ),
        getDocs(
          query(collection(db, "moods"), where("user_id", "==", user.uid)),
        ),
        getDocs(
          query(
            collection(db, "goals"),
            where("user_id", "==", user.uid),
            where("status", "==", "active"),
          ),
        ),
      ]);

      const workouts = workoutSnap.docs.map((d) => d.data());
      const meals = mealSnap.docs.map((d) => d.data());
      const moods = moodSnap.docs.map((d) => d.data());
      const goals = goalSnap.docs.map((d) => d.data());

      const recentWorkouts = workouts.filter((w) => w.date >= weekAgo);
      const recentMeals = meals.filter((m) => m.date >= weekAgo);
      const recentMoods = moods.filter((m) => m.date >= weekAgo);

      const avgCaloriesBurned =
        recentWorkouts.length > 0
          ? recentWorkouts.reduce((a, w) => a + (w.calories_burned || 0), 0) /
            recentWorkouts.length
          : 0;
      const avgCaloriesIntake =
        recentMeals.length > 0
          ? recentMeals.reduce((a, m) => a + (m.calories_intake || 0), 0) /
            recentMeals.length
          : 0;
      const avgMoodScore =
        recentMoods.length > 0
          ? recentMoods.reduce((a, m) => a + (m.mood_score || 3), 0) /
            recentMoods.length
          : 3;
      const avgProtein =
        recentMeals.length > 0
          ? recentMeals.reduce((a, m) => a + (m.protein || 0), 0) /
            recentMeals.length
          : 0;

      const latestMood =
        recentMoods.length > 0 ? recentMoods[recentMoods.length - 1] : {};

      const workoutTypes = recentWorkouts.map((w) => w.type).filter(Boolean);
      const dominantWorkout =
        workoutTypes.length > 0
          ? workoutTypes.sort(
              (a, b) =>
                workoutTypes.filter((v) => v === b).length -
                workoutTypes.filter((v) => v === a).length,
            )[0]
          : "";

      const intensities = recentWorkouts
        .map((w) => w.intensity)
        .filter(Boolean);
      const dominantIntensity =
        intensities.length > 0
          ? intensities.sort(
              (a, b) =>
                intensities.filter((v) => v === b).length -
                intensities.filter((v) => v === a).length,
            )[0]
          : "Medium";

      setUserData({
        workoutCount: recentWorkouts.length,
        avgCaloriesBurned: Math.round(avgCaloriesBurned),
        avgCaloriesIntake: Math.round(avgCaloriesIntake),
        avgMoodScore: avgMoodScore.toFixed(1),
        avgProtein: Math.round(avgProtein),
        stressLevel: latestMood.stress_level || "Low",
        sleepQuality: latestMood.sleep_quality || "Good",
        activeGoals: goals.map((g) => g.goal_type),
        dominantWorkout,
        dominantIntensity,
        mealCount: recentMeals.length,
        moodCount: recentMoods.length,
      });
    } catch (error) {
      console.log("fetchUserSummary error:", error.code);
    } finally {
      setFetchingData(false);
    }
  };

  const fetchSavedRecommendations = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDocs(
        query(
          collection(db, "recommendations"),
          where("user_id", "==", user.uid),
        ),
      );
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSavedRecs(data);
    } catch (error) {
      console.log("fetchSavedRecs error:", error.code);
    }
  };

  const generateRecommendations = async () => {
    if (!userData) {
      setErrorMsg("Please log some workouts, meals and moods first!");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch(`${FLASK_URL}/api/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) throw new Error("Server error");
      const result = await response.json();

      if (result.success) {
        const rec = result.data;
        setRecommendations({
          fitness_tip: rec.fitness_tip,
          nutrition_tip: rec.nutrition_tip,
          wellness_tip: rec.wellness_tip,
          wellness_score: rec.wellness_score,
          correlations: rec.correlations || [],
          generated_date: rec.generated_date,
        });

        const user = auth.currentUser;
        if (user) {
          await addDoc(collection(db, "recommendations"), {
            user_id: user.uid,
            fitness_tip: rec.fitness_tip,
            nutrition_tip: rec.nutrition_tip,
            wellness_tip: rec.wellness_tip,
            wellness_score: rec.wellness_score,
            generated_date: rec.generated_date,
            createdAt: new Date().toISOString(),
          });
          fetchSavedRecommendations();
        }
      }
    } catch (error) {
      setErrorMsg(
        "Could not connect to recommendation engine. Make sure Flask is running.",
      );
      console.log("generateRecs error:", error.message);
    }
    setLoading(false);
  };

  const getScoreColor = (score) => {
    if (score >= 75)
      return {
        color: theme.colors.primary,
        bg: theme.colors.primaryUltraLight,
      };
    if (score >= 50) return { color: "#F4A261", bg: "#FEF0E6" };
    return { color: "#E76F51", bg: "#FDE8E4" };
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent 🌟";
    if (score >= 65) return "Good 👍";
    if (score >= 50) return "Fair 📈";
    return "Needs Work 💪";
  };

  const statItems = userData
    ? [
        {
          label: "Workouts",
          value: userData.workoutCount,
          icon: "💪",
          color: theme.colors.primary,
          bg: theme.colors.primaryUltraLight,
        },
        {
          label: "Avg Calories",
          value: userData.avgCaloriesIntake,
          icon: "🔥",
          color: "#E76F51",
          bg: "#FDE8E4",
        },
        {
          label: "Avg Mood",
          value: userData.avgMoodScore,
          icon: "😊",
          color: "#F4A261",
          bg: "#FEF0E6",
        },
        {
          label: "Stress",
          value: userData.stressLevel,
          icon: "🧘",
          color: "#9C27B0",
          bg: "#F3E5F5",
        },
        {
          label: "Meals Logged",
          value: userData.mealCount,
          icon: "🥗",
          color: "#2196F3",
          bg: "#E3F2FD",
        },
        {
          label: "Mood Entries",
          value: userData.moodCount,
          icon: "📝",
          color: "#00ACC1",
          bg: "#E0F7FA",
        },
        {
          label: "Avg Protein",
          value: `${userData.avgProtein}g`,
          icon: "🥩",
          color: "#52B788",
          bg: "#D8F3DC",
        },
        {
          label: "Sleep",
          value: userData.sleepQuality,
          icon: "😴",
          color: "#7B1FA2",
          bg: "#F3E5F5",
        },
      ]
    : [];

  const recItems = recommendations
    ? [
        {
          category: "FITNESS",
          icon: "💪",
          text: recommendations.fitness_tip,
          color: theme.colors.primary,
          bg: theme.colors.primaryUltraLight,
        },
        {
          category: "NUTRITION",
          icon: "🥗",
          text: recommendations.nutrition_tip,
          color: "#2196F3",
          bg: "#E3F2FD",
        },
        {
          category: "WELLNESS",
          icon: "🧘",
          text: recommendations.wellness_tip,
          color: "#FF9800",
          bg: "#FFF8E1",
        },
      ]
    : [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Smart Recommendations</Text>
        <Text style={styles.subtitle}>
          ⚡ Powered by Python analysis engine
        </Text>
      </View>

      {/* Error Message */}
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      {/* Weekly Summary */}
      {fetchingData ? (
        <ActivityIndicator
          color={theme.colors.primary}
          style={{ marginVertical: 24 }}
        />
      ) : userData ? (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Your Weekly Summary</Text>
          <View style={styles.statsGrid}>
            {statItems.map((item, i) => (
              <View
                key={i}
                style={[styles.statItem, { backgroundColor: item.bg }]}
              >
                <Text style={styles.statIcon}>{item.icon}</Text>
                <Text style={[styles.statVal, { color: item.color }]}>
                  {item.value}
                </Text>
                <Text style={styles.statLbl}>{item.label}</Text>
              </View>
            ))}
          </View>
          {userData.activeGoals.length > 0 && (
            <View style={styles.goalsRow}>
              <Text style={styles.goalsLabel}>Active Goals: </Text>
              <Text style={styles.goalsValue}>
                {userData.activeGoals
                  .map((g) => g.replace(/_/g, " "))
                  .join(", ")}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noDataCard}>
          <Text style={styles.noDataEmoji}>📊</Text>
          <Text style={styles.noDataTitle}>No data yet</Text>
          <Text style={styles.noDataText}>
            Log workouts, meals and moods to get personalized recommendations.
          </Text>
        </View>
      )}

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
        onPress={generateRecommendations}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.generateBtnIcon}>🔍</Text>
            <Text style={styles.generateBtnText}>
              Analyze & Get Recommendations
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Current Recommendations */}
      {recommendations && (
        <View style={styles.recsContainer}>
          <Text style={styles.recsTitle}>✨ Your Personalized Tips</Text>
          <Text style={styles.recsDate}>
            Generated: {recommendations.generated_date}
          </Text>

          {/* Wellness Score */}
          {(() => {
            const sc = getScoreColor(recommendations.wellness_score);
            return (
              <View
                style={[
                  styles.scoreCard,
                  { backgroundColor: sc.bg, borderColor: sc.color },
                ]}
              >
                <Text style={styles.scoreLabel}>Overall Wellness Score</Text>
                <Text style={[styles.scoreValue, { color: sc.color }]}>
                  {recommendations.wellness_score}
                  <Text style={styles.scoreMax}>/100</Text>
                </Text>
                <Text style={[styles.scoreStatus, { color: sc.color }]}>
                  {getScoreLabel(recommendations.wellness_score)}
                </Text>
                <View style={styles.scoreBar}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${recommendations.wellness_score}%`,
                        backgroundColor: sc.color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })()}

          {/* Tip Cards */}
          {recItems.map((item, i) => (
            <View
              key={i}
              style={[styles.recCard, { borderLeftColor: item.color }]}
            >
              <View
                style={[styles.recCategoryRow, { backgroundColor: item.bg }]}
              >
                <Text style={styles.recCategoryIcon}>{item.icon}</Text>
                <Text style={[styles.recCategory, { color: item.color }]}>
                  {item.category}
                </Text>
              </View>
              <Text style={styles.recText}>{item.text}</Text>
            </View>
          ))}

          {/* Data Insights */}
          {recommendations.correlations.length > 0 && (
            <View style={styles.correlationsCard}>
              <Text style={styles.correlationsTitle}>🔍 Data Insights</Text>
              {recommendations.correlations.map((c, i) => (
                <View key={i} style={styles.correlationRow}>
                  <Text style={styles.correlationDot}>•</Text>
                  <Text style={styles.correlationText}>{c}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Past Recommendations */}
      {savedRecs.length > 1 && (
        <>
          <Text style={styles.sectionTitle}>📅 Past Recommendations</Text>
          {savedRecs.slice(1, 5).map((rec) => {
            const sc = getScoreColor(rec.wellness_score || 50);
            return (
              <View key={rec.id} style={styles.pastRecCard}>
                <View style={styles.pastRecHeader}>
                  <Text style={styles.pastRecDate}>
                    📅 {rec.generated_date}
                  </Text>
                  {rec.wellness_score && (
                    <View
                      style={[
                        styles.pastRecScoreBadge,
                        { backgroundColor: sc.bg },
                      ]}
                    >
                      <Text
                        style={[styles.pastRecScoreText, { color: sc.color }]}
                      >
                        {rec.wellness_score}/100
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.pastRecText}>💪 {rec.fitness_tip}</Text>
                <Text style={styles.pastRecText}>🥗 {rec.nutrition_tip}</Text>
                <Text style={styles.pastRecText}>🧘 {rec.wellness_tip}</Text>
              </View>
            );
          })}
        </>
      )}

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
  subtitle: { fontSize: 13, color: theme.colors.primaryPastel, marginTop: 4 },

  errorBanner: {
    backgroundColor: theme.colors.errorLight,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
  },
  errorBannerText: { color: theme.colors.error, fontSize: theme.fontSize.sm },

  statsCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...theme.shadow.medium,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  statItem: {
    width: "23%",
    borderRadius: theme.borderRadius.md,
    padding: 10,
    alignItems: "center",
    marginRight: "2%",
    marginBottom: 8,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statVal: { fontSize: 14, fontWeight: "700" },
  statLbl: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  goalsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  goalsLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  goalsValue: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  noDataCard: { alignItems: "center", padding: 32, marginHorizontal: 16 },
  noDataEmoji: { fontSize: 48, marginBottom: 12 },
  noDataTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  noDataText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },

  generateBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.medium,
  },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnIcon: { fontSize: 20, marginRight: 8 },
  generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  recsContainer: { marginHorizontal: 16, marginBottom: 16 },
  recsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  recsDate: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 16 },

  scoreCard: {
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 2,
    ...theme.shadow.small,
  },
  scoreLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "600",
  },
  scoreValue: { fontSize: 56, fontWeight: "700" },
  scoreMax: { fontSize: 20, fontWeight: "400" },
  scoreStatus: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 12,
  },
  scoreBar: {
    width: "100%",
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreBarFill: { height: "100%", borderRadius: 4 },

  recCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 12,
    borderLeftWidth: 4,
    overflow: "hidden",
    ...theme.shadow.small,
  },
  recCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingHorizontal: 14,
  },
  recCategoryIcon: { fontSize: 16, marginRight: 6 },
  recCategory: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  recText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    padding: 14,
    paddingTop: 8,
  },

  correlationsCard: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginTop: 4,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  correlationsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 10,
  },
  correlationRow: { flexDirection: "row", marginBottom: 6 },
  correlationDot: {
    color: theme.colors.primary,
    fontWeight: "700",
    marginRight: 8,
  },
  correlationText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginLeft: 16,
    marginBottom: 12,
  },
  pastRecCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    ...theme.shadow.small,
  },
  pastRecHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pastRecDate: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  pastRecScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  pastRecScoreText: { fontSize: 12, fontWeight: "700" },
  pastRecText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 19,
  },
});
