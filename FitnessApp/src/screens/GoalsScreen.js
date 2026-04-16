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
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { theme } from "../config/theme";

export default function GoalsScreen() {
  const [goalType, setGoalType] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [startDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  const goalTypes = [
    {
      label: "⚖️ Weight Loss",
      value: "weight_loss",
      color: "#E76F51",
      bg: "#FDE8E4",
    },
    {
      label: "💪 Muscle Gain",
      value: "muscle_gain",
      color: theme.colors.primary,
      bg: theme.colors.primaryUltraLight,
    },
    { label: "🏃 Cardio", value: "cardio", color: "#2196F3", bg: "#E3F2FD" },
    {
      label: "🧘 Stress Relief",
      value: "stress_reduction",
      color: "#9C27B0",
      bg: "#F3E5F5",
    },
    {
      label: "😴 Better Sleep",
      value: "better_sleep",
      color: "#00ACC1",
      bg: "#E0F7FA",
    },
    {
      label: "🥗 Healthy Eating",
      value: "healthy_eating",
      color: "#F4A261",
      bg: "#FEF0E6",
    },
  ];

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDocs(
        query(collection(db, "goals"), where("user_id", "==", user.uid)),
      );
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setGoals(data);
    } catch (error) {
      console.log("fetchGoals error:", error.code);
    }
  };

  // Only allow numbers for target value
  const handleTargetValueChange = (text) => {
    const numeric = text.replace(/[^0-9.]/g, "");
    setTargetValue(numeric);
    if (errors.targetValue) setErrors((p) => ({ ...p, targetValue: null }));
  };

  // Validate date format
  const validateDate = (date) => {
    if (!date) return true;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d) && d > new Date();
  };

  const validate = () => {
    const newErrors = {};
    if (!goalType) newErrors.goalType = "Please select a goal type";
    if (!goalDescription.trim())
      newErrors.goalDescription = "Please describe your goal";
    else if (goalDescription.trim().length < 5)
      newErrors.goalDescription = "Description must be at least 5 characters";
    if (targetValue && isNaN(parseFloat(targetValue)))
      newErrors.targetValue = "Target value must be a number";
    if (endDate && !validateDate(endDate))
      newErrors.endDate = "Please enter a valid future date (YYYY-MM-DD)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddGoal = async () => {
    if (!validate()) return;
    setLoading(true);
    setSuccessMsg("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      await addDoc(collection(db, "goals"), {
        user_id: user.uid,
        goal_type: goalType,
        description: goalDescription.trim().slice(0, 300),
        target_value: parseFloat(targetValue) || 0,
        start_date: startDate,
        end_date: endDate || "",
        status: "active",
        progress: 0,
        createdAt: new Date().toISOString(),
      });

      setSuccessMsg("✅ Goal added successfully!");
      setGoalType("");
      setGoalDescription("");
      setTargetValue("");
      setEndDate("");
      setErrors({});
      fetchGoals();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      setErrors({ general: "Failed to save goal. Please try again." });
      console.log("addGoal error:", error.code);
    }
    setLoading(false);
  };

  const handleToggleGoal = async (goalId, currentStatus) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const newStatus = currentStatus === "active" ? "completed" : "active";
      await updateDoc(doc(db, "goals", goalId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      fetchGoals();
    } catch (error) {
      console.log("toggleGoal error:", error.code);
    }
  };

  const getGoalTypeInfo = (value) => goalTypes.find((t) => t.value === value);

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Goals</Text>
        <Text style={styles.subtitle}>Set and track your wellness targets</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.colors.primaryUltraLight },
          ]}
        >
          <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
            {activeGoals.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.colors.primary }]}>
            Active
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#D8F3DC" }]}>
          <Text style={[styles.summaryValue, { color: "#2E7D5E" }]}>
            {completedGoals.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: "#2E7D5E" }]}>
            Completed
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#FEF0E6" }]}>
          <Text style={[styles.summaryValue, { color: "#F4A261" }]}>
            {goals.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: "#F4A261" }]}>Total</Text>
        </View>
      </View>

      {/* Add Goal Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>🎯 Add New Goal</Text>

        {errors.general && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {errors.general}</Text>
          </View>
        )}
        {successMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* Goal Type */}
        <Text style={styles.label}>
          Goal Type <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.goalTypesGrid}>
          {goalTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.goalTypeBtn,
                goalType === type.value && {
                  backgroundColor: type.bg,
                  borderColor: type.color,
                },
              ]}
              onPress={() => {
                setGoalType(type.value);
                if (errors.goalType)
                  setErrors((p) => ({ ...p, goalType: null }));
              }}
            >
              <Text
                style={[
                  styles.goalTypeText,
                  goalType === type.value && {
                    color: type.color,
                    fontWeight: "700",
                  },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.goalType && (
          <Text style={styles.errorText}>{errors.goalType}</Text>
        )}

        {/* Description */}
        <Text style={styles.label}>
          Goal Description <Text style={styles.required}>*</Text>
        </Text>
        <View
          style={[
            styles.inputWrapper,
            errors.goalDescription && styles.inputWrapperError,
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="e.g. Lose 5kg by eating healthier and exercising 3x/week"
            placeholderTextColor={theme.colors.textMuted}
            value={goalDescription}
            onChangeText={(text) => {
              setGoalDescription(text.slice(0, 300));
              if (errors.goalDescription)
                setErrors((p) => ({ ...p, goalDescription: null }));
            }}
            multiline
            maxLength={300}
          />
        </View>
        {errors.goalDescription && (
          <Text style={styles.errorText}>{errors.goalDescription}</Text>
        )}
        <Text style={styles.charCount}>{goalDescription.length}/300</Text>

        {/* Target Value */}
        <Text style={styles.label}>
          Target Value <Text style={styles.optional}>(optional)</Text>
        </Text>
        <View
          style={[
            styles.inputRowWrapper,
            errors.targetValue && styles.inputWrapperError,
          ]}
        >
          <Text style={styles.inputIcon}>🎯</Text>
          <TextInput
            style={styles.inputRow}
            placeholder="e.g. 5 (kg, km, days...)"
            placeholderTextColor={theme.colors.textMuted}
            value={targetValue}
            onChangeText={handleTargetValueChange}
            keyboardType="decimal-pad"
            maxLength={6}
          />
        </View>
        {errors.targetValue && (
          <Text style={styles.errorText}>{errors.targetValue}</Text>
        )}

        {/* End Date */}
        <Text style={styles.label}>
          Target Date <Text style={styles.optional}>(optional)</Text>
        </Text>
        <View
          style={[
            styles.inputRowWrapper,
            errors.endDate && styles.inputWrapperError,
          ]}
        >
          <Text style={styles.inputIcon}>📅</Text>
          <TextInput
            style={styles.inputRow}
            placeholder="YYYY-MM-DD (e.g. 2026-12-01)"
            placeholderTextColor={theme.colors.textMuted}
            value={endDate}
            onChangeText={(text) => {
              setEndDate(text);
              if (errors.endDate) setErrors((p) => ({ ...p, endDate: null }));
            }}
            maxLength={10}
          />
        </View>
        {errors.endDate && (
          <Text style={styles.errorText}>{errors.endDate}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAddGoal}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>+ Add Goal</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Goals */}
      <Text style={styles.sectionTitle}>
        🔥 Active Goals ({activeGoals.length})
      </Text>
      {activeGoals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>No active goals yet</Text>
          <Text style={styles.emptyText}>
            Add your first goal above to get started!
          </Text>
        </View>
      ) : (
        activeGoals.map((goal) => {
          const typeInfo = getGoalTypeInfo(goal.goal_type);
          return (
            <View
              key={goal.id}
              style={[
                styles.goalCard,
                { borderLeftColor: typeInfo?.color || theme.colors.primary },
              ]}
            >
              <View style={styles.goalContent}>
                <View
                  style={[
                    styles.goalTypeBadge,
                    {
                      backgroundColor:
                        typeInfo?.bg || theme.colors.primaryUltraLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.goalTypeBadgeText,
                      { color: typeInfo?.color || theme.colors.primary },
                    ]}
                  >
                    {typeInfo?.label || goal.goal_type}
                  </Text>
                </View>
                <Text style={styles.goalDesc}>{goal.description}</Text>
                <View style={styles.goalMeta}>
                  <Text style={styles.goalMetaText}>
                    📅 Started: {goal.start_date}
                  </Text>
                  {goal.end_date ? (
                    <Text style={styles.goalMetaText}>
                      🎯 Target: {goal.end_date}
                    </Text>
                  ) : null}
                  {goal.target_value > 0 ? (
                    <Text style={styles.goalMetaText}>
                      📊 Target: {goal.target_value}
                    </Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => handleToggleGoal(goal.id, goal.status)}
              >
                <Text style={styles.completeBtnText}>✓{"\n"}Done</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            ✅ Completed Goals ({completedGoals.length})
          </Text>
          {completedGoals.map((goal) => {
            const typeInfo = getGoalTypeInfo(goal.goal_type);
            return (
              <View
                key={goal.id}
                style={[styles.goalCard, styles.goalCardCompleted]}
              >
                <View style={styles.goalContent}>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>✅ COMPLETED</Text>
                  </View>
                  <Text style={styles.goalTypeBadgeText}>
                    {typeInfo?.label || goal.goal_type}
                  </Text>
                  <Text
                    style={[
                      styles.goalDesc,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {goal.description}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.reactivateBtn}
                  onPress={() => handleToggleGoal(goal.id, goal.status)}
                >
                  <Text style={styles.reactivateBtnText}>↩{"\n"}Redo</Text>
                </TouchableOpacity>
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
  subtitle: { fontSize: 14, color: theme.colors.primaryPastel, marginTop: 4 },

  summaryRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 4,
    ...theme.shadow.small,
  },
  summaryValue: { fontSize: 28, fontWeight: "700" },
  summaryLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },

  formCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    ...theme.shadow.medium,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 16,
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
  successText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },

  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  required: { color: theme.colors.error },
  optional: { color: theme.colors.textMuted, fontWeight: "400" },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginBottom: 8,
    marginLeft: 4,
  },
  charCount: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: "right",
    marginBottom: 4,
  },

  goalTypesGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  goalTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    marginRight: 8,
    marginBottom: 8,
  },
  goalTypeText: { color: theme.colors.textMuted, fontSize: 13 },

  inputWrapper: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 4,
  },
  inputWrapperError: { borderColor: theme.colors.error },
  input: { fontSize: 14, color: theme.colors.textPrimary, minHeight: 44 },

  inputRowWrapper: {
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
  inputIcon: { fontSize: 16, marginRight: 8 },
  inputRow: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    height: "100%",
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

  goalCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    ...theme.shadow.small,
  },
  goalCardCompleted: { opacity: 0.7 },
  goalContent: { flex: 1, padding: 14 },
  goalTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    marginBottom: 8,
  },
  goalTypeBadgeText: { fontSize: 12, fontWeight: "700" },
  goalDesc: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },
  goalMeta: { flexDirection: "row", flexWrap: "wrap" },
  goalMetaText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginRight: 12,
  },

  completedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#D8F3DC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    marginBottom: 6,
  },
  completedBadgeText: { color: "#2E7D5E", fontSize: 10, fontWeight: "700" },

  completeBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginRight: 12,
    alignItems: "center",
    minWidth: 50,
  },
  completeBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  reactivateBtn: {
    backgroundColor: "#F4A261",
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginRight: 12,
    alignItems: "center",
    minWidth: 50,
  },
  reactivateBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
});
