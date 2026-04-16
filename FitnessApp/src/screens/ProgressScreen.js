import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { LineChart, BarChart } from "react-native-chart-kit";
import { FLASK_URL } from "../config/api";
import { theme } from "../config/theme";

const screenWidth = Dimensions.get("window").width - 48;

export default function ProgressScreen() {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("weekly");
  const [progressData, setProgressData] = useState(null);
  const [moodChartData, setMoodChartData] = useState(null);
  const [workoutChartData, setWorkoutChartData] = useState(null);
  const [caloriesChartData, setCaloriesChartData] = useState(null);

  useEffect(() => {
    fetchProgress();
  }, [period]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const [workoutSnap, mealSnap, moodSnap] = await Promise.all([
        getDocs(
          query(collection(db, "workouts"), where("user_id", "==", user.uid)),
        ),
        getDocs(
          query(collection(db, "meals"), where("user_id", "==", user.uid)),
        ),
        getDocs(
          query(collection(db, "moods"), where("user_id", "==", user.uid)),
        ),
      ]);

      const workouts = workoutSnap.docs.map((d) => d.data());
      const meals = mealSnap.docs.map((d) => d.data());
      const moods = moodSnap.docs.map((d) => d.data());

      try {
        const response = await fetch(`${FLASK_URL}/api/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workouts, meals, moods, period }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setProgressData(result.data);
            buildCharts(result.data, moods, workouts, meals);
          }
        }
      } catch {
        // Flask offline — build charts from local data
        buildChartsLocal(moods, workouts);
      }
    } catch (error) {
      console.log("fetchProgress error:", error.code);
    }
    setLoading(false);
  };

  const buildChartsLocal = (moods, workouts) => {
    const sortedMoods = [...moods].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
    const last7 = sortedMoods.slice(-7);
    if (last7.length >= 2) {
      setMoodChartData({
        labels: last7.map((m) => {
          const parts = m.date.split("-");
          return `${parts[1]}/${parts[2]}`;
        }),
        datasets: [{ data: last7.map((m) => m.mood_score || 3) }],
      });
    }
  };

  const buildCharts = (data, moods, workouts, meals) => {
    const sortedMoods = [...moods].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
    const last7 = sortedMoods.slice(-7);
    if (last7.length >= 2) {
      setMoodChartData({
        labels: last7.map((m) => {
          const parts = m.date.split("-");
          return `${parts[1]}/${parts[2]}`;
        }),
        datasets: [{ data: last7.map((m) => m.mood_score || 3) }],
      });
    }

    if (data.weekly_breakdown?.length > 0) {
      setWorkoutChartData({
        labels: data.weekly_breakdown.map((w) => w.week),
        datasets: [{ data: data.weekly_breakdown.map((w) => w.workouts || 0) }],
      });
      setCaloriesChartData({
        labels: data.weekly_breakdown.map((w) => w.week),
        datasets: [
          { data: data.weekly_breakdown.map((w) => w.avg_calories || 0) },
        ],
      });
    }
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

  const lightChartConfig = (lineColor) => ({
    backgroundColor: theme.colors.cardBackground,
    backgroundGradientFrom: theme.colors.cardBackground,
    backgroundGradientTo: theme.colors.cardBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => lineColor || `rgba(46, 125, 94, ${opacity})`,
    labelColor: () => theme.colors.textSecondary,
    propsForDots: { r: "5", strokeWidth: "2", stroke: theme.colors.primary },
    propsForBackgroundLines: { stroke: theme.colors.border },
    propsForLabels: { fontSize: 10 },
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Progress Report</Text>
        <Text style={styles.subtitle}>
          Track your wellness journey over time
        </Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {[
          { value: "weekly", label: "📅 This Week" },
          { value: "monthly", label: "📆 This Month" },
        ].map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[
              styles.periodBtn,
              period === p.value && styles.periodBtnActive,
            ]}
            onPress={() => setPeriod(p.value)}
          >
            <Text
              style={[
                styles.periodText,
                period === p.value && styles.periodTextActive,
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing your progress...</Text>
        </View>
      ) : (
        <>
          {/* Overall Score */}
          {progressData?.overall_score !== undefined &&
            (() => {
              const sc = getScoreColor(progressData.overall_score);
              return (
                <View
                  style={[
                    styles.scoreCard,
                    { backgroundColor: sc.bg, borderColor: sc.color },
                  ]}
                >
                  <Text style={styles.scoreLabel}>Overall Progress Score</Text>
                  <Text style={[styles.scoreValue, { color: sc.color }]}>
                    {progressData.overall_score}
                    <Text style={styles.scoreMax}>/100</Text>
                  </Text>
                  <View style={styles.scoreBar}>
                    <View
                      style={[
                        styles.scoreBarFill,
                        {
                          width: `${progressData.overall_score}%`,
                          backgroundColor: sc.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })()}

          {/* Mood Chart */}
          {moodChartData && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>😊 Mood Trend</Text>
              <LineChart
                data={moodChartData}
                width={screenWidth}
                height={180}
                chartConfig={lightChartConfig()}
                bezier
                style={styles.chart}
              />
            </View>
          )}

          {/* Workout Chart */}
          {workoutChartData && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>💪 Workouts Per Week</Text>
              <BarChart
                data={workoutChartData}
                width={screenWidth}
                height={180}
                chartConfig={lightChartConfig(
                  (opacity) => `rgba(33, 150, 243, ${opacity})`,
                )}
                style={styles.chart}
              />
            </View>
          )}

          {/* Calories Chart */}
          {caloriesChartData && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>🔥 Avg Calories Per Week</Text>
              <BarChart
                data={caloriesChartData}
                width={screenWidth}
                height={180}
                chartConfig={lightChartConfig(
                  (opacity) => `rgba(231, 111, 81, ${opacity})`,
                )}
                style={styles.chart}
              />
            </View>
          )}

          {/* Workout Summary */}
          {progressData?.workout_summary && (
            <View
              style={[
                styles.summaryCard,
                { borderTopColor: theme.colors.primary },
              ]}
            >
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryIcon}>💪</Text>
                <Text style={styles.summaryTitle}>Workout Summary</Text>
              </View>
              <View style={styles.summaryGrid}>
                {[
                  {
                    value: progressData.workout_summary.total_sessions,
                    label: "Sessions",
                    color: theme.colors.primary,
                    bg: theme.colors.primaryUltraLight,
                  },
                  {
                    value: progressData.workout_summary.total_calories_burned,
                    label: "Cal Burned",
                    color: "#E76F51",
                    bg: "#FDE8E4",
                  },
                  {
                    value: progressData.workout_summary.total_duration,
                    label: "Minutes",
                    color: "#2196F3",
                    bg: "#E3F2FD",
                  },
                  {
                    value: progressData.workout_summary.most_common_type,
                    label: "Top Activity",
                    color: "#9C27B0",
                    bg: "#F3E5F5",
                  },
                ].map((item, i) => (
                  <View
                    key={i}
                    style={[styles.summaryItem, { backgroundColor: item.bg }]}
                  >
                    <Text style={[styles.summaryValue, { color: item.color }]}>
                      {item.value}
                    </Text>
                    <Text style={styles.summaryLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              {progressData.workout_summary.message && (
                <Text style={styles.summaryMessage}>
                  {progressData.workout_summary.message}
                </Text>
              )}
            </View>
          )}

          {/* Nutrition Summary */}
          {progressData?.nutrition_summary && (
            <View style={[styles.summaryCard, { borderTopColor: "#2196F3" }]}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryIcon}>🥗</Text>
                <Text style={styles.summaryTitle}>Nutrition Summary</Text>
              </View>
              <View style={styles.summaryGrid}>
                {[
                  {
                    value: progressData.nutrition_summary.avg_daily_calories,
                    label: "Avg Cal",
                    color: "#E76F51",
                    bg: "#FDE8E4",
                  },
                  {
                    value: `${progressData.nutrition_summary.avg_protein}g`,
                    label: "Protein",
                    color: theme.colors.primary,
                    bg: theme.colors.primaryUltraLight,
                  },
                  {
                    value: `${progressData.nutrition_summary.avg_carbs}g`,
                    label: "Carbs",
                    color: "#2196F3",
                    bg: "#E3F2FD",
                  },
                  {
                    value: `${progressData.nutrition_summary.avg_fats}g`,
                    label: "Fats",
                    color: "#9C27B0",
                    bg: "#F3E5F5",
                  },
                ].map((item, i) => (
                  <View
                    key={i}
                    style={[styles.summaryItem, { backgroundColor: item.bg }]}
                  >
                    <Text style={[styles.summaryValue, { color: item.color }]}>
                      {item.value}
                    </Text>
                    <Text style={styles.summaryLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              {progressData.nutrition_summary.message && (
                <Text style={styles.summaryMessage}>
                  {progressData.nutrition_summary.message}
                </Text>
              )}
            </View>
          )}

          {/* Mood Summary */}
          {progressData?.mood_summary && (
            <View style={[styles.summaryCard, { borderTopColor: "#FF9800" }]}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryIcon}>😊</Text>
                <Text style={styles.summaryTitle}>Mood Summary</Text>
              </View>
              <View style={styles.summaryGrid}>
                {[
                  {
                    value: progressData.mood_summary.avg_mood_score,
                    label: "Avg Score",
                    color: "#FF9800",
                    bg: "#FFF8E1",
                  },
                  {
                    value: progressData.mood_summary.total_entries,
                    label: "Entries",
                    color: theme.colors.primary,
                    bg: theme.colors.primaryUltraLight,
                  },
                  {
                    value: progressData.mood_summary.most_common_mood,
                    label: "Top Mood",
                    color: "#9C27B0",
                    bg: "#F3E5F5",
                  },
                ].map((item, i) => (
                  <View
                    key={i}
                    style={[styles.summaryItem, { backgroundColor: item.bg }]}
                  >
                    <Text style={[styles.summaryValue, { color: item.color }]}>
                      {item.value}
                    </Text>
                    <Text style={styles.summaryLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              {progressData.mood_summary.message && (
                <Text style={styles.summaryMessage}>
                  {progressData.mood_summary.message}
                </Text>
              )}
            </View>
          )}

          {/* Achievements */}
          {progressData?.achievements?.length > 0 && (
            <View style={styles.achievementsCard}>
              <Text style={styles.achievementsSectionTitle}>
                🏆 Achievements
              </Text>
              {progressData.achievements.map((a, i) => (
                <View key={i} style={styles.achievementItem}>
                  <View style={styles.achievementIconBg}>
                    <Text style={styles.achievementIcon}>{a.icon}</Text>
                  </View>
                  <View style={styles.achievementTextBlock}>
                    <Text style={styles.achievementTitle}>{a.title}</Text>
                    <Text style={styles.achievementDesc}>{a.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Trends */}
          {progressData?.trends?.length > 0 && (
            <View style={styles.trendsCard}>
              <Text style={styles.trendsSectionTitle}>📊 Key Trends</Text>
              {progressData.trends.map((t, i) => {
                const tColor =
                  t.type === "positive"
                    ? theme.colors.primary
                    : t.type === "negative"
                      ? theme.colors.error
                      : "#F4A261";
                const tBg =
                  t.type === "positive"
                    ? theme.colors.primaryUltraLight
                    : t.type === "negative"
                      ? theme.colors.errorLight
                      : "#FEF0E6";
                return (
                  <View
                    key={i}
                    style={[
                      styles.trendItem,
                      { borderLeftColor: tColor, backgroundColor: tBg },
                    ]}
                  >
                    <Text style={[styles.trendText, { color: tColor }]}>
                      {t.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {!progressData && !loading && !moodChartData && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>No data yet</Text>
              <Text style={styles.emptyText}>
                Start logging workouts, meals and mood to see your progress
                here.
              </Text>
            </View>
          )}
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
  subtitle: { fontSize: 14, color: theme.colors.primaryPastel, marginTop: 4 },

  periodRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 16 },
  periodBtn: {
    flex: 1,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginRight: 8,
    ...theme.shadow.small,
  },
  periodBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  periodTextActive: { color: "#fff" },

  loadingContainer: { alignItems: "center", marginTop: 60 },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },

  scoreCard: {
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 2,
    ...theme.shadow.small,
  },
  scoreLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  scoreValue: { fontSize: 52, fontWeight: "700" },
  scoreMax: { fontSize: 20, fontWeight: "400" },
  scoreBar: {
    width: "100%",
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginTop: 12,
    overflow: "hidden",
  },
  scoreBarFill: { height: "100%", borderRadius: 4 },

  chartCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...theme.shadow.small,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  chart: { borderRadius: 12, marginLeft: -8 },

  summaryCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderTopWidth: 4,
    ...theme.shadow.small,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryIcon: { fontSize: 20, marginRight: 8 },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 3,
  },
  summaryValue: { fontSize: 15, fontWeight: "700" },
  summaryLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
    textAlign: "center",
  },
  summaryMessage: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
    lineHeight: 20,
  },

  achievementsCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...theme.shadow.small,
  },
  achievementsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 14,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  achievementIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryUltraLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  achievementIcon: { fontSize: 24 },
  achievementTextBlock: { flex: 1 },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  achievementDesc: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  trendsCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...theme.shadow.small,
  },
  trendsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  trendItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: theme.borderRadius.sm,
  },
  trendText: { fontSize: 13, lineHeight: 20, fontWeight: "500" },

  emptyState: { alignItems: "center", marginTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
