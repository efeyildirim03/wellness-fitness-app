import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { theme } from "../config/theme";

export default function WorkoutScreen() {
  const [workoutType, setWorkoutType] = useState("");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [loading, setLoading] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  const workoutTypes = [
    { label: "🏃 Running", value: "Running" },
    { label: "🚴 Cycling", value: "Cycling" },
    { label: "🏊 Swimming", value: "Swimming" },
    { label: "🏋️ Weights", value: "Weightlifting" },
    { label: "🧘 Yoga", value: "Yoga" },
    { label: "⚡ HIIT", value: "HIIT" },
    { label: "🚶 Walking", value: "Walking" },
    { label: "⚽ Sports", value: "Sports" },
    { label: "🤸 Other", value: "Other" },
  ];

  const intensityLevels = [
    { label: "🟢 Low", value: "Low", color: "#2E7D5E", bg: "#D8F3DC" },
    { label: "🟡 Medium", value: "Medium", color: "#F4A261", bg: "#FEF0E6" },
    { label: "🔴 High", value: "High", color: "#E76F51", bg: "#FDE8E4" },
  ];

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDocs(
        query(collection(db, "workouts"), where("user_id", "==", user.uid)),
      );
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setWorkouts(data);
    } catch (error) {
      console.log("fetchWorkouts error:", error.code);
    }
  };

  // Only allow numbers for duration and calories
  const handleDurationChange = (text) => {
    const numeric = text.replace(/[^0-9]/g, "");
    setDuration(numeric);
    if (errors.duration) setErrors((p) => ({ ...p, duration: null }));
  };

  const handleCaloriesChange = (text) => {
    const numeric = text.replace(/[^0-9]/g, "");
    setCaloriesBurned(numeric);
  };

  const validate = () => {
    const newErrors = {};
    if (!workoutType) newErrors.workoutType = "Please select a workout type";
    if (!duration) newErrors.duration = "Duration is required";
    else if (parseInt(duration) < 1)
      newErrors.duration = "Duration must be at least 1 minute";
    else if (parseInt(duration) > 600)
      newErrors.duration = "Duration cannot exceed 600 minutes";
    if (!intensity) newErrors.intensity = "Please select intensity level";
    if (caloriesBurned && parseInt(caloriesBurned) > 5000) {
      newErrors.caloriesBurned = "Please enter a realistic calorie value";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogWorkout = async () => {
    if (!validate()) return;
    setLoading(true);
    setSuccessMsg("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      await addDoc(collection(db, "workouts"), {
        user_id: user.uid,
        type: workoutType,
        duration: parseInt(duration),
        intensity,
        calories_burned: parseInt(caloriesBurned) || 0,
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      });

      setSuccessMsg("✅ Workout logged successfully!");
      setWorkoutType("");
      setDuration("");
      setIntensity("");
      setCaloriesBurned("");
      setErrors({});
      fetchWorkouts();

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      setErrors({ general: "Failed to save workout. Please try again." });
      console.log("logWorkout error:", error.code);
    }
    setLoading(false);
  };

  const getIntensityStyle = (intensityVal) => {
    const found = intensityLevels.find((l) => l.value === intensityVal);
    return (
      found || { color: theme.colors.textSecondary, bg: theme.colors.border }
    );
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Log Workout</Text>
        <Text style={styles.subtitle}>Track your physical activity</Text>
      </View>

      <View style={styles.formCard}>
        {/* General Error */}
        {errors.general && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {errors.general}</Text>
          </View>
        )}

        {/* Success Message */}
        {successMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* Workout Type */}
        <Text style={styles.label}>
          Workout Type <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={{ paddingRight: 8 }}
        >
          {workoutTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.chip,
                workoutType === type.value && styles.chipActive,
              ]}
              onPress={() => {
                setWorkoutType(type.value);
                if (errors.workoutType)
                  setErrors((p) => ({ ...p, workoutType: null }));
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  workoutType === type.value && styles.chipTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {errors.workoutType && (
          <Text style={styles.errorText}>{errors.workoutType}</Text>
        )}

        {/* Duration */}
        <Text style={styles.label}>
          Duration (minutes) <Text style={styles.required}>*</Text>
        </Text>
        <View
          style={[
            styles.inputWrapper,
            errors.duration && styles.inputWrapperError,
          ]}
        >
          <Text style={styles.inputIcon}>⏱️</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 30"
            placeholderTextColor={theme.colors.textMuted}
            value={duration}
            onChangeText={handleDurationChange}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.inputSuffix}>min</Text>
        </View>
        {errors.duration && (
          <Text style={styles.errorText}>{errors.duration}</Text>
        )}

        {/* Intensity */}
        <Text style={styles.label}>
          Intensity <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.intensityRow}>
          {intensityLevels.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.intensityBtn,
                intensity === level.value && {
                  backgroundColor: level.bg,
                  borderColor: level.color,
                },
              ]}
              onPress={() => {
                setIntensity(level.value);
                if (errors.intensity)
                  setErrors((p) => ({ ...p, intensity: null }));
              }}
            >
              <Text
                style={[
                  styles.intensityText,
                  intensity === level.value && {
                    color: level.color,
                    fontWeight: "700",
                  },
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.intensity && (
          <Text style={styles.errorText}>{errors.intensity}</Text>
        )}

        {/* Calories */}
        <Text style={styles.label}>
          Calories Burned <Text style={styles.optional}>(optional)</Text>
        </Text>
        <View
          style={[
            styles.inputWrapper,
            errors.caloriesBurned && styles.inputWrapperError,
          ]}
        >
          <Text style={styles.inputIcon}>🔥</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 250"
            placeholderTextColor={theme.colors.textMuted}
            value={caloriesBurned}
            onChangeText={handleCaloriesChange}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Text style={styles.inputSuffix}>kcal</Text>
        </View>
        {errors.caloriesBurned && (
          <Text style={styles.errorText}>{errors.caloriesBurned}</Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogWorkout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>+ Log Workout</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Workouts */}
      <Text style={styles.sectionTitle}>Recent Workouts</Text>
      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💪</Text>
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptyText}>
            Log your first workout above to get started!
          </Text>
        </View>
      ) : (
        workouts.slice(0, 10).map((workout) => {
          const iStyle = getIntensityStyle(workout.intensity);
          return (
            <View key={workout.id} style={styles.workoutCard}>
              <View
                style={[
                  styles.workoutAccent,
                  { backgroundColor: iStyle.color },
                ]}
              />
              <View style={styles.workoutContent}>
                <View style={styles.workoutTop}>
                  <Text style={styles.workoutType}>{workout.type}</Text>
                  <View
                    style={[
                      styles.intensityTag,
                      { backgroundColor: iStyle.bg },
                    ]}
                  >
                    <Text
                      style={[styles.intensityTagText, { color: iStyle.color }]}
                    >
                      {workout.intensity}
                    </Text>
                  </View>
                </View>
                <View style={styles.workoutStats}>
                  <Text style={styles.workoutStat}>
                    ⏱ {workout.duration} min
                  </Text>
                  <Text style={styles.workoutStat}>
                    🔥 {workout.calories_burned} kcal
                  </Text>
                  <Text style={styles.workoutStat}>📅 {workout.date}</Text>
                </View>
              </View>
            </View>
          );
        })
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

  formCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    ...theme.shadow.medium,
  },

  errorBanner: {
    backgroundColor: theme.colors.errorLight,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
  },
  errorBannerText: { color: theme.colors.error, fontSize: theme.fontSize.sm },
  successBanner: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  successBannerText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },

  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 10,
    marginTop: 16,
  },
  required: { color: theme.colors.error },
  optional: { color: theme.colors.textMuted, fontWeight: "400" },

  chipRow: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderColor: theme.colors.primary,
  },
  chipText: { color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: theme.colors.primary },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 4,
  },
  inputWrapperError: { borderColor: theme.colors.error },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    height: "100%",
  },
  inputSuffix: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginBottom: 8,
    marginLeft: 4,
  },

  intensityRow: { flexDirection: "row", marginBottom: 4 },
  intensityBtn: {
    flex: 1,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    backgroundColor: theme.colors.background,
    marginRight: 8,
  },
  intensityText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },

  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    ...theme.shadow.small,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: theme.fontSize.lg, fontWeight: "700" },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginLeft: 16,
    marginBottom: 12,
  },
  emptyState: { alignItems: "center", padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },

  workoutCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    overflow: "hidden",
    ...theme.shadow.small,
  },
  workoutAccent: { width: 5 },
  workoutContent: { flex: 1, padding: 14 },
  workoutTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  workoutType: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  intensityTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  intensityTagText: { fontSize: 12, fontWeight: "700" },
  workoutStats: { flexDirection: "row", flexWrap: "wrap" },
  workoutStat: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginRight: 12,
  },
});
