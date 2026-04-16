import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { LineChart } from "react-native-chart-kit";
import { theme } from "../config/theme";

const screenWidth = Dimensions.get("window").width - 64;

export default function MoodScreen() {
  const [selectedMood, setSelectedMood] = useState("");
  const [notes, setNotes] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [moodHistory, setMoodHistory] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [activeTab, setActiveTab] = useState("log");
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  // Mindfulness states
  const [activeExercise, setActiveExercise] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [breathPhase, setBreathPhase] = useState("");
  const [breathCount, setBreathCount] = useState(0);
  const timerRef = useRef(null);
  const breathRef = useRef(null);

  const moods = [
    { emoji: "😄", label: "Happy", value: 5, color: "#FFD700", bg: "#FFFDE7" },
    { emoji: "😊", label: "Good", value: 4, color: "#52B788", bg: "#D8F3DC" },
    {
      emoji: "😐",
      label: "Neutral",
      value: 3,
      color: "#90A4AE",
      bg: "#ECEFF1",
    },
    { emoji: "😔", label: "Sad", value: 2, color: "#78909C", bg: "#ECEFF1" },
    {
      emoji: "😰",
      label: "Anxious",
      value: 2,
      color: "#F4A261",
      bg: "#FEF0E6",
    },
    {
      emoji: "😤",
      label: "Stressed",
      value: 1,
      color: "#E76F51",
      bg: "#FDE8E4",
    },
    { emoji: "😴", label: "Tired", value: 2, color: "#9C27B0", bg: "#F3E5F5" },
    {
      emoji: "⚡",
      label: "Energized",
      value: 5,
      color: "#2196F3",
      bg: "#E3F2FD",
    },
  ];

  const sleepOptions = [
    { label: "😞 Poor", value: "Poor", color: "#E76F51", bg: "#FDE8E4" },
    { label: "😐 Fair", value: "Fair", color: "#F4A261", bg: "#FEF0E6" },
    { label: "😊 Good", value: "Good", color: "#52B788", bg: "#D8F3DC" },
    { label: "😄 Great", value: "Excellent", color: "#2E7D5E", bg: "#B7E4C7" },
  ];

  const stressOptions = [
    { label: "🟢 Low", value: "Low", color: "#2E7D5E", bg: "#D8F3DC" },
    {
      label: "🟡 Moderate",
      value: "Moderate",
      color: "#F4A261",
      bg: "#FEF0E6",
    },
    { label: "🔴 High", value: "High", color: "#E76F51", bg: "#FDE8E4" },
    {
      label: "⛔ Very High",
      value: "Very High",
      color: "#C62828",
      bg: "#FFEBEE",
    },
  ];

  const mindfulnessExercises = [
    {
      id: "box_breathing",
      title: "📦 Box Breathing",
      desc: "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s",
      duration: 240,
      color: theme.colors.primary,
      bg: theme.colors.primaryUltraLight,
      benefit: "Reduces stress and anxiety instantly",
      phases: [
        { label: "Inhale...", duration: 4 },
        { label: "Hold...", duration: 4 },
        { label: "Exhale...", duration: 4 },
        { label: "Hold...", duration: 4 },
      ],
    },
    {
      id: "478_breathing",
      title: "🌬️ 4-7-8 Breathing",
      desc: "Inhale 4s → Hold 7s → Exhale 8s",
      duration: 190,
      color: "#2196F3",
      bg: "#E3F2FD",
      benefit: "Calms the nervous system, aids sleep",
      phases: [
        { label: "Inhale...", duration: 4 },
        { label: "Hold...", duration: 7 },
        { label: "Exhale...", duration: 8 },
      ],
    },
    {
      id: "deep_breathing",
      title: "🧘 Deep Belly Breathing",
      desc: "Slow deep breaths from your belly",
      duration: 180,
      color: "#9C27B0",
      bg: "#F3E5F5",
      benefit: "Lowers heart rate and blood pressure",
      phases: [
        { label: "Breathe In...", duration: 5 },
        { label: "Breathe Out...", duration: 5 },
      ],
    },
    {
      id: "meditation",
      title: "🕯️ 5-Min Meditation",
      desc: "Focus on your breath for 5 minutes",
      duration: 300,
      color: "#FF9800",
      bg: "#FFF8E1",
      benefit: "Improves focus and emotional balance",
      phases: [{ label: "Focus on your breath...", duration: 300 }],
    },
    {
      id: "body_scan",
      title: "🌊 Body Scan",
      desc: "Scan from head to toe, releasing tension",
      duration: 180,
      color: "#00ACC1",
      bg: "#E0F7FA",
      benefit: "Releases physical tension and stress",
      phases: [
        { label: "Head & Neck...", duration: 30 },
        { label: "Shoulders & Arms...", duration: 30 },
        { label: "Chest & Back...", duration: 30 },
        { label: "Belly & Hips...", duration: 30 },
        { label: "Legs & Feet...", duration: 30 },
        { label: "Whole Body...", duration: 30 },
      ],
    },
    {
      id: "gratitude",
      title: "🙏 Gratitude Moment",
      desc: "Reflect on 3 things you are grateful for",
      duration: 120,
      color: "#E76F51",
      bg: "#FDE8E4",
      benefit: "Boosts mood and positive thinking",
      phases: [
        { label: "Think of something you're grateful for...", duration: 40 },
        { label: "Feel the gratitude deeply...", duration: 40 },
        { label: "Set a positive intention...", duration: 40 },
      ],
    },
  ];

  useEffect(() => {
    fetchMoodHistory();
    return () => {
      clearInterval(timerRef.current);
      clearInterval(breathRef.current);
    };
  }, []);

  const fetchMoodHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDocs(
        query(collection(db, "moods"), where("user_id", "==", user.uid)),
      );
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setMoodHistory(data);

      if (data.length >= 2) {
        const last7 = data.slice(-7);
        setChartData({
          labels: last7.map((m) => {
            const parts = m.date.split("-");
            return `${parts[1]}/${parts[2]}`;
          }),
          datasets: [{ data: last7.map((m) => m.mood_score || 3) }],
        });
      }
    } catch (error) {
      console.log("fetchMoodHistory error:", error.code);
    }
  };

  const handleLogMood = async () => {
    if (!selectedMood) {
      setErrors({ mood: "Please select how you are feeling" });
      return;
    }
    setLoading(true);
    setSuccessMsg("");
    setErrors({});
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const moodObj = moods.find((m) => m.label === selectedMood);

      // Sanitize notes — limit length
      const sanitizedNotes = notes.trim().slice(0, 500);

      await addDoc(collection(db, "moods"), {
        user_id: user.uid,
        mood_level: selectedMood,
        mood_score: moodObj?.value || 3,
        notes: sanitizedNotes,
        sleep_quality: sleepQuality || "",
        stress_level: stressLevel || "",
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      });

      setSuccessMsg("✅ Mood logged successfully!");
      setSelectedMood("");
      setNotes("");
      setSleepQuality("");
      setStressLevel("");
      fetchMoodHistory();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      setErrors({ general: "Failed to save. Please try again." });
      console.log("logMood error:", error.code);
    }
    setLoading(false);
  };

  const startExercise = (exercise) => {
    setActiveExercise(exercise);
    setTimerSeconds(exercise.duration);
    setBreathCount(0);

    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearInterval(breathRef.current);
          setBreathPhase("✅ Complete!");
          logMindfulnessSession(exercise); // ← ADD THIS LINE
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let phaseIndex = 0;
    let phaseTimer = 0;
    setBreathPhase(exercise.phases[0].label);

    breathRef.current = setInterval(() => {
      phaseTimer++;
      const currentPhase = exercise.phases[phaseIndex];
      if (phaseTimer >= currentPhase.duration) {
        phaseTimer = 0;
        phaseIndex = (phaseIndex + 1) % exercise.phases.length;
        if (phaseIndex === 0) setBreathCount((prev) => prev + 1);
        setBreathPhase(exercise.phases[phaseIndex].label);
      }
    }, 1000);
  };

  const stopExercise = () => {
    clearInterval(timerRef.current);
    clearInterval(breathRef.current);
    setActiveExercise(null);
    setBreathPhase("");
    setTimerSeconds(0);
  };

  const logMindfulnessSession = async (exercise) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await addDoc(collection(db, "mindfulness"), {
        user_id: user.uid,
        exercise_id: exercise.id,
        exercise_title: exercise.title,
        duration_seconds: exercise.duration,
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.log("logMindfulness error:", error.code);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const renderLogTab = () => (
    <View style={styles.tabContent}>
      {/* Chart */}
      {chartData && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📈 Your Mood Trend</Text>
          <LineChart
            data={chartData}
            width={screenWidth}
            height={160}
            chartConfig={{
              backgroundColor: theme.colors.cardBackground,
              backgroundGradientFrom: theme.colors.cardBackground,
              backgroundGradientTo: theme.colors.cardBackground,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(46, 125, 94, ${opacity})`,
              labelColor: () => theme.colors.textSecondary,
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: theme.colors.primary,
              },
              propsForBackgroundLines: { stroke: theme.colors.border },
            }}
            bezier
            style={{ borderRadius: 12, marginLeft: -16 }}
          />
        </View>
      )}

      <View style={styles.formCard}>
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

        {/* Mood Selection */}
        <Text style={styles.label}>
          How are you feeling? <Text style={styles.required}>*</Text>
        </Text>
        {errors.mood && <Text style={styles.errorText}>{errors.mood}</Text>}
        <View style={styles.moodGrid}>
          {moods.map((mood) => (
            <TouchableOpacity
              key={mood.label}
              style={[
                styles.moodBtn,
                selectedMood === mood.label && {
                  backgroundColor: mood.bg,
                  borderColor: mood.color,
                },
              ]}
              onPress={() => {
                setSelectedMood(mood.label);
                if (errors.mood) setErrors((p) => ({ ...p, mood: null }));
              }}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text
                style={[
                  styles.moodLabel,
                  selectedMood === mood.label && {
                    color: mood.color,
                    fontWeight: "700",
                  },
                ]}
              >
                {mood.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sleep Quality */}
        <Text style={styles.label}>Sleep Quality</Text>
        <View style={styles.optionRow}>
          {sleepOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionChip,
                sleepQuality === opt.value && {
                  backgroundColor: opt.bg,
                  borderColor: opt.color,
                },
              ]}
              onPress={() => setSleepQuality(opt.value)}
            >
              <Text
                style={[
                  styles.optionChipText,
                  sleepQuality === opt.value && {
                    color: opt.color,
                    fontWeight: "700",
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stress Level */}
        <Text style={styles.label}>Stress Level</Text>
        <View style={styles.optionRow}>
          {stressOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionChip,
                stressLevel === opt.value && {
                  backgroundColor: opt.bg,
                  borderColor: opt.color,
                },
              ]}
              onPress={() => setStressLevel(opt.value)}
            >
              <Text
                style={[
                  styles.optionChipText,
                  stressLevel === opt.value && {
                    color: opt.color,
                    fontWeight: "700",
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.label}>
          Notes <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.notesInput}
          placeholder="How was your day? Any thoughts or feelings to capture..."
          placeholderTextColor={theme.colors.textMuted}
          value={notes}
          onChangeText={(text) => setNotes(text.slice(0, 500))}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={styles.charCount}>{notes.length}/500</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogMood}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>+ Log Mood</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Mood History */}
      <Text style={styles.sectionTitle}>Mood History</Text>
      {moodHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>😊</Text>
          <Text style={styles.emptyTitle}>No entries yet</Text>
          <Text style={styles.emptyText}>Start tracking your mood above!</Text>
        </View>
      ) : (
        moodHistory
          .slice(-10)
          .reverse()
          .map((entry) => {
            const moodObj = moods.find((m) => m.label === entry.mood_level);
            return (
              <View
                key={entry.id}
                style={[
                  styles.historyCard,
                  moodObj && { borderLeftColor: moodObj.color },
                ]}
              >
                <View style={styles.historyLeft}>
                  <Text style={styles.historyMood}>
                    {moodObj?.emoji} {entry.mood_level}
                  </Text>
                  <Text style={styles.historyDate}>📅 {entry.date}</Text>
                  {entry.notes ? (
                    <Text style={styles.historyNotes}>"{entry.notes}"</Text>
                  ) : null}
                </View>
                <View style={styles.historyRight}>
                  {entry.sleep_quality ? (
                    <Text style={styles.historyTag}>
                      😴 {entry.sleep_quality}
                    </Text>
                  ) : null}
                  {entry.stress_level ? (
                    <Text style={styles.historyTag}>
                      😤 {entry.stress_level}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
      )}
    </View>
  );

  const renderMindfulnessTab = () => (
    <View style={styles.tabContent}>
      {/* Active Exercise — Full Detail View */}
      {activeExercise ? (
        <View style={styles.activeExerciseContainer}>
          {/* Timer Card */}
          <View
            style={[
              styles.timerCard,
              {
                borderColor: activeExercise.color,
                backgroundColor: activeExercise.bg,
              },
            ]}
          >
            <Text style={styles.timerTitle}>{activeExercise.title}</Text>
            <Text style={[styles.timerTime, { color: activeExercise.color }]}>
              {formatTime(timerSeconds)}
            </Text>
            <Text
              style={[styles.breathPhaseText, { color: activeExercise.color }]}
            >
              {breathPhase}
            </Text>
            {breathCount > 0 && (
              <Text style={styles.breathCount}>Cycles: {breathCount}</Text>
            )}
            {timerSeconds === 0 && (
              <Text style={styles.completeText}>
                🎉 Well done! Session logged to your progress.
              </Text>
            )}
            <TouchableOpacity style={styles.stopBtn} onPress={stopExercise}>
              <Text style={styles.stopBtnText}>⏹ Stop</Text>
            </TouchableOpacity>
          </View>

          {/* Exercise Details — shown after starting */}
          <View
            style={[
              styles.exerciseDetailCard,
              { borderLeftColor: activeExercise.color },
            ]}
          >
            <Text style={styles.exerciseDetailTitle}>About this exercise</Text>
            <Text style={styles.exerciseDetailDesc}>{activeExercise.desc}</Text>
            <Text
              style={[
                styles.exerciseDetailBenefit,
                { color: activeExercise.color },
              ]}
            >
              ✨ {activeExercise.benefit}
            </Text>
            <View style={styles.phasesContainer}>
              <Text style={styles.phasesTitle}>Phases:</Text>
              {activeExercise.phases.map((phase, i) => (
                <View key={i} style={styles.phaseRow}>
                  <View
                    style={[
                      styles.phaseDot,
                      {
                        backgroundColor:
                          breathPhase === phase.label
                            ? activeExercise.color
                            : theme.colors.border,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.phaseLabel,
                      {
                        color:
                          breathPhase === phase.label
                            ? activeExercise.color
                            : theme.colors.textSecondary,
                        fontWeight: breathPhase === phase.label ? "700" : "400",
                      },
                    ]}
                  >
                    {phase.label.replace("...", "")} — {phase.duration}s
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Intro Quote */}
          <View style={styles.mindfulnessQuoteCard}>
            <Text style={styles.quoteEmoji}>🌿</Text>
            <Text style={styles.quoteText}>
              "Almost everything will work again if you unplug it for a few
              minutes — including you."
            </Text>
            <Text style={styles.quoteAuthor}>— Anne Lamott</Text>
          </View>

          {/* Exercise Cards — Clean minimal */}
          <Text style={styles.exercisesSectionLabel}>CHOOSE AN EXERCISE</Text>
          {mindfulnessExercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={[styles.exerciseCard, { borderLeftColor: exercise.color }]}
              onPress={() => startExercise(exercise)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.exerciseIconBg,
                  { backgroundColor: exercise.bg },
                ]}
              >
                <Text style={styles.exerciseIcon}>
                  {exercise.title.split(" ")[0]}
                </Text>
              </View>
              <View style={styles.exerciseCardContent}>
                <Text style={styles.exerciseCardTitle}>
                  {exercise.title.split(" ").slice(1).join(" ")}
                </Text>
                <Text style={styles.exerciseCardDuration}>
                  ⏱ {Math.floor(exercise.duration / 60)} min{" "}
                  {exercise.duration % 60 > 0
                    ? `${exercise.duration % 60}s`
                    : ""}
                </Text>
              </View>
              <View
                style={[
                  styles.startCircle,
                  { backgroundColor: exercise.color },
                ]}
              >
                <Text style={styles.startCircleText}>▶</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Mindfulness Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Mindfulness Tips</Text>
            {[
              "Practice daily for best results",
              "Find a quiet, comfortable space",
              "Focus on your breath, not thoughts",
              "Even 5 minutes makes a difference",
              "Log your mood before and after",
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipDot}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mood & Mindfulness</Text>
        <Text style={styles.subtitle}>
          Track your emotions and practice mindfulness
        </Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "log" && styles.tabActive]}
          onPress={() => setActiveTab("log")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "log" && styles.tabTextActive,
            ]}
          >
            Log Mood
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "mindfulness" && styles.tabActive]}
          onPress={() => setActiveTab("mindfulness")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "mindfulness" && styles.tabTextActive,
            ]}
          >
            Mindfulness
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "log" ? renderLogTab() : renderMindfulnessTab()}
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
  },
  title: { fontSize: 26, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: 14, color: theme.colors.primaryPastel, marginTop: 4 },

  tabRow: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    ...theme.shadow.small,
  },
  tab: {
    flex: 1,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { color: theme.colors.textMuted, fontWeight: "700", fontSize: 14 },
  tabTextActive: { color: "#fff" },

  tabContent: { paddingHorizontal: 16 },

  chartCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...theme.shadow.small,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },

  formCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
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
  successText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },

  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 10,
    marginTop: 12,
  },
  required: { color: theme.colors.error },
  optional: { color: theme.colors.textMuted, fontWeight: "400" },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginBottom: 8,
  },

  moodGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  moodBtn: {
    width: "22%",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  moodEmoji: { fontSize: 26 },
  moodLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },

  optionRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  optionChipText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
    fontSize: 12,
  },

  notesInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.textPrimary,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  charCount: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: "right",
    marginBottom: 8,
  },

  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    ...theme.shadow.small,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: theme.fontSize.lg, fontWeight: "700" },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
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

  historyCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primaryLight,
    ...theme.shadow.small,
  },
  historyLeft: { flex: 1 },
  historyMood: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  historyDate: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  historyNotes: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    fontStyle: "italic",
  },
  historyRight: { alignItems: "flex-end" },
  historyTag: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },

  /// Mindfulness redesign
  mindfulnessQuoteCard: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  quoteEmoji: { fontSize: 32, marginBottom: 10 },
  quoteText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 8,
  },
  quoteAuthor: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  exercisesSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginBottom: 10,
    letterSpacing: 1,
  },
  exerciseCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    ...theme.shadow.small,
  },
  exerciseIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exerciseIcon: { fontSize: 24 },
  exerciseCardContent: { flex: 1 },
  exerciseCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  exerciseCardDuration: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  startCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  startCircleText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  activeExerciseContainer: { flex: 1 },
  timerCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 2,
    ...theme.shadow.medium,
  },
  timerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  timerTime: { fontSize: 48, fontWeight: "700", marginVertical: 12 },
  breathPhaseText: { fontSize: 20, fontWeight: "600", marginVertical: 8 },
  breathCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  completeText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginVertical: 12,
    textAlign: "center",
  },
  stopBtn: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    marginTop: 12,
  },
  stopBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  exerciseDetailCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    ...theme.shadow.small,
  },
  exerciseDetailTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  exerciseDetailDesc: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  exerciseDetailBenefit: { fontSize: 13, fontWeight: "600", marginBottom: 12 },
  phasesContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  phasesTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  phaseRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  phaseDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  phaseLabel: { fontSize: 13 },
  tipsCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
    ...theme.shadow.small,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  tipRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  tipDot: { fontSize: 12, color: theme.colors.primary, marginRight: 8 },
  tipText: { fontSize: 12, color: theme.colors.textSecondary, flex: 1 },
});
