import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { theme } from "../config/theme";

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preferredActivities, setPreferredActivities] = useState([]);
  const [wellnessFocus, setWellnessFocus] = useState("");
  const [errors, setErrors] = useState({});

  const fitnessLevels = [
    {
      label: "🌱 Beginner",
      value: "beginner",
      desc: "Just starting out — new to regular exercise",
    },
    {
      label: "🔥 Intermediate",
      value: "intermediate",
      desc: "Workout occasionally — some experience",
    },
    {
      label: "⚡ Advanced",
      value: "advanced",
      desc: "Regular intense training — very active",
    },
  ];

  const goalTypes = [
    { label: "⚖️ Weight Loss", value: "weight_loss" },
    { label: "💪 Muscle Gain", value: "muscle_gain" },
    { label: "🏃 Improve Cardio", value: "cardio" },
    { label: "🧘 Reduce Stress", value: "stress_reduction" },
    { label: "😴 Better Sleep", value: "better_sleep" },
    { label: "🥗 Eat Healthier", value: "healthy_eating" },
  ];

  const activities = [
    "Running",
    "Cycling",
    "Swimming",
    "Weightlifting",
    "Yoga",
    "HIIT",
    "Walking",
    "Sports",
  ];

  const wellnessFocuses = [
    {
      label: "🧘 Mental Calm",
      value: "mental_calm",
      desc: "Focus on stress reduction and mindfulness",
    },
    {
      label: "💪 Physical Strength",
      value: "physical_strength",
      desc: "Focus on building fitness and strength",
    },
    {
      label: "⚖️ Balance Both",
      value: "balanced",
      desc: "Equal focus on mind and body wellness",
    },
    {
      label: "😴 Better Rest",
      value: "better_rest",
      desc: "Focus on sleep quality and recovery",
    },
  ];

  const toggleActivity = (activity) => {
    setPreferredActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity],
    );
  };

  // Validate date format YYYY-MM-DD
  const validateDate = (date) => {
    if (!date) return true; // optional
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d) && d > new Date();
  };

  // Only allow numbers for target value
  const handleTargetValueChange = (text) => {
    const numericOnly = text.replace(/[^0-9.]/g, "");
    setTargetValue(numericOnly);
  };

  const validateStep = (currentStep) => {
    const newErrors = {};
    if (currentStep === 2 && !primaryGoal) {
      newErrors.primaryGoal = "Please select a goal to continue";
    }
    if (currentStep === 3) {
      if (endDate && !validateDate(endDate)) {
        newErrors.endDate = "Please enter a valid future date (YYYY-MM-DD)";
      }
      if (targetValue && isNaN(parseFloat(targetValue))) {
        newErrors.targetValue = "Target value must be a number";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = async () => {
    if (!primaryGoal) {
      Alert.alert("Required", "Please go back and select a primary goal");
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "Session expired. Please login again.");
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, "users", user.uid), {
        fitnessLevel: fitnessLevel || "beginner",
        preferredActivities,
        wellnessFocus: wellnessFocus || "balanced",
        onboardingDone: true,
        updatedAt: new Date().toISOString(),
      });

      await addDoc(collection(db, "goals"), {
        user_id: user.uid,
        goal_type: primaryGoal,
        description:
          goalDescription.trim() ||
          `My goal: ${primaryGoal.replace(/_/g, " ")}`,
        target_value: parseFloat(targetValue) || 0,
        start_date: new Date().toISOString().split("T")[0],
        end_date: endDate || "",
        status: "active",
        progress: 0,
        createdAt: new Date().toISOString(),
      });

      onComplete();
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      console.log(error);
    }
    setLoading(false);
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep(step + 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepEmoji}>🏃</Text>
            <Text style={styles.stepTitle}>What's your fitness level?</Text>
            <Text style={styles.stepSubtitle}>
              This helps us personalize your experience
            </Text>
            {fitnessLevels.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.optionCard,
                  fitnessLevel === level.value && styles.optionCardActive,
                ]}
                onPress={() => setFitnessLevel(level.value)}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    fitnessLevel === level.value && styles.optionLabelActive,
                  ]}
                >
                  {level.label}
                </Text>
                <Text style={styles.optionDesc}>{level.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepEmoji}>🎯</Text>
            <Text style={styles.stepTitle}>What's your primary goal?</Text>
            <Text style={styles.stepSubtitle}>
              We'll set this as your first tracked goal
            </Text>
            {errors.primaryGoal && (
              <Text style={styles.errorText}>{errors.primaryGoal}</Text>
            )}
            <View style={styles.goalsGrid}>
              {goalTypes.map((goal) => (
                <TouchableOpacity
                  key={goal.value}
                  style={[
                    styles.goalCard,
                    primaryGoal === goal.value && styles.goalCardActive,
                  ]}
                  onPress={() => {
                    setPrimaryGoal(goal.value);
                    if (errors.primaryGoal)
                      setErrors((p) => ({ ...p, primaryGoal: null }));
                  }}
                >
                  <Text
                    style={[
                      styles.goalLabel,
                      primaryGoal === goal.value && styles.goalLabelActive,
                    ]}
                  >
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepEmoji}>📝</Text>
            <Text style={styles.stepTitle}>Tell us more about your goal</Text>
            <Text style={styles.stepSubtitle}>
              Optional — helps track progress better
            </Text>

            <Text style={styles.inputLabel}>Describe your goal</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lose 5kg in 2 months"
              placeholderTextColor={theme.colors.textMuted}
              value={goalDescription}
              onChangeText={(text) => setGoalDescription(text.slice(0, 200))}
              maxLength={200}
            />

            <Text style={styles.inputLabel}>Target value (optional)</Text>
            <TextInput
              style={[styles.input, errors.targetValue && styles.inputError]}
              placeholder="e.g. 5 (kg, km, weeks)"
              placeholderTextColor={theme.colors.textMuted}
              value={targetValue}
              onChangeText={handleTargetValueChange}
              keyboardType="decimal-pad"
            />
            {errors.targetValue && (
              <Text style={styles.errorText}>{errors.targetValue}</Text>
            )}

            <Text style={styles.inputLabel}>Target date (optional)</Text>
            <TextInput
              style={[styles.input, errors.endDate && styles.inputError]}
              placeholder="YYYY-MM-DD (e.g. 2026-12-01)"
              placeholderTextColor={theme.colors.textMuted}
              value={endDate}
              onChangeText={(text) => {
                setEndDate(text);
                if (errors.endDate) setErrors((p) => ({ ...p, endDate: null }));
              }}
              maxLength={10}
            />
            {errors.endDate && (
              <Text style={styles.errorText}>{errors.endDate}</Text>
            )}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepEmoji}>💪</Text>
            <Text style={styles.stepTitle}>Preferred activities?</Text>
            <Text style={styles.stepSubtitle}>
              Select all that apply — skip if unsure
            </Text>
            <View style={styles.activitiesGrid}>
              {activities.map((activity) => (
                <TouchableOpacity
                  key={activity}
                  style={[
                    styles.activityChip,
                    preferredActivities.includes(activity) &&
                      styles.activityChipActive,
                  ]}
                  onPress={() => toggleActivity(activity)}
                >
                  <Text
                    style={[
                      styles.activityText,
                      preferredActivities.includes(activity) &&
                        styles.activityTextActive,
                    ]}
                  >
                    {activity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.selectedCount}>
              {preferredActivities.length > 0
                ? `✓ ${preferredActivities.length} selected: ${preferredActivities.join(", ")}`
                : "None selected yet"}
            </Text>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepEmoji}>🌟</Text>
            <Text style={styles.stepTitle}>Your wellness focus?</Text>
            <Text style={styles.stepSubtitle}>
              This shapes your daily recommendations
            </Text>
            {wellnessFocuses.map((focus) => (
              <TouchableOpacity
                key={focus.value}
                style={[
                  styles.optionCard,
                  wellnessFocus === focus.value && styles.optionCardActive,
                ]}
                onPress={() => setWellnessFocus(focus.value)}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    wellnessFocus === focus.value && styles.optionLabelActive,
                  ]}
                >
                  {focus.label}
                </Text>
                <Text style={styles.optionDesc}>{focus.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.stepsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                s <= step && styles.stepDotActive,
                s === step && styles.stepDotCurrent,
              ]}
            >
              {s < step && <Text style={styles.stepDotCheck}>✓</Text>}
              {s >= step && (
                <Text
                  style={[
                    styles.stepDotNum,
                    s === step && styles.stepDotNumActive,
                  ]}
                >
                  {s}
                </Text>
              )}
            </View>
          ))}
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((step - 1) / 4) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>Step {step} of 5</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome! 👋</Text>
          <Text style={styles.headerSubtitle}>
            Let's set up your wellness profile
          </Text>
        </View>
        {renderStep()}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navButtons}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep(step - 1)}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        {step < 5 ? (
          <TouchableOpacity
            style={[styles.nextBtn, step === 1 && { flex: 1 }]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>🚀 Get Started!</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  progressContainer: { padding: 24, paddingTop: 48, paddingBottom: 8 },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  stepDotActive: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderColor: theme.colors.primary,
  },
  stepDotCurrent: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stepDotCheck: {
    color: theme.colors.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
  stepDotNum: {
    color: theme.colors.textMuted,
    fontWeight: "bold",
    fontSize: 13,
  },
  stepDotNumActive: { color: "#fff" },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "right",
  },

  scrollView: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },

  stepContainer: { padding: 24 },
  stepEmoji: { fontSize: 48, marginBottom: 12 },
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  stepSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
  },

  optionCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadow.small,
  },
  optionCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryUltraLight,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  optionLabelActive: { color: theme.colors.primary },
  optionDesc: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },

  goalsGrid: { flexDirection: "row", flexWrap: "wrap" },
  goalCard: {
    width: "47%",
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    ...theme.shadow.small,
  },
  goalCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryUltraLight,
  },
  goalLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  goalLabelActive: { color: theme.colors.primary },

  inputLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: theme.colors.cardBackground,
    color: theme.colors.textPrimary,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  inputError: { borderColor: theme.colors.error },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.xs,
    marginBottom: 8,
    marginLeft: 4,
  },

  activitiesGrid: { flexDirection: "row", flexWrap: "wrap" },
  activityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  activityChipActive: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderColor: theme.colors.primary,
  },
  activityText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
    fontSize: 14,
  },
  activityTextActive: { color: theme.colors.primary },
  selectedCount: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    fontStyle: "italic",
  },

  navButtons: {
    flexDirection: "row",
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  backBtn: {
    flex: 1,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: theme.colors.cardBackground,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  backBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 16,
  },
  nextBtn: {
    flex: 2,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
