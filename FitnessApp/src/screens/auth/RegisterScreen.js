import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { theme } from "../../config/theme";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (pwd) => ({
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
  });

  const getPasswordStrength = (pwd) => {
    const checks = validatePassword(pwd);
    const passed = Object.values(checks).filter(Boolean).length;
    if (passed <= 1) return { label: "Weak", color: "#E76F51", width: "25%" };
    if (passed === 2) return { label: "Fair", color: "#F4A261", width: "50%" };
    if (passed === 3) return { label: "Good", color: "#52B788", width: "75%" };
    return { label: "Strong", color: "#2E7D5E", width: "100%" };
  };

  // Only allow numeric input for age
  const handleAgeChange = (text) => {
    const numericOnly = text.replace(/[^0-9]/g, "");
    setAge(numericOnly);
    if (errors.age) setErrors((p) => ({ ...p, age: null }));
  };

  // Only allow letters and spaces for name
  const handleNameChange = (text) => {
    const lettersOnly = text.replace(/[^a-zA-Z\s]/g, "");
    setName(lettersOnly);
    if (errors.name) setErrors((p) => ({ ...p, name: null }));
  };

  const validate = () => {
    const newErrors = {};

    if (!name.trim()) newErrors.name = "Full name is required";
    else if (name.trim().length < 2)
      newErrors.name = "Name must be at least 2 characters";

    if (!email) newErrors.email = "Email is required";
    else if (!validateEmail(email))
      newErrors.email = "Please enter a valid email address";

    if (!age) newErrors.age = "Age is required";
    else if (parseInt(age) < 13)
      newErrors.age = "You must be at least 13 years old";
    else if (parseInt(age) > 120) newErrors.age = "Please enter a valid age";

    if (!gender) newErrors.gender = "Please select your gender";

    if (!password) {
      newErrors.password = "Password is required";
    } else {
      const checks = validatePassword(password);
      if (!checks.length)
        newErrors.password = "Password must be at least 8 characters";
      else if (!checks.uppercase)
        newErrors.password =
          "Password must contain at least one uppercase letter (A-Z)";
      else if (!checks.number)
        newErrors.password = "Password must contain at least one number (0-9)";
      else if (!checks.special)
        newErrors.password =
          "Password must contain at least one special character (!@#$%)";
    }

    if (!confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    if (!consentGiven)
      newErrors.consent = "You must accept the privacy policy to continue";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        user_id: user.uid,
        name: name.trim(),
        email: email.trim(),
        age: parseInt(age),
        gender,
        gdpr_consent: true,
        gdpr_consent_date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      let message = "Registration failed. Please try again.";
      if (error.code === "auth/email-already-in-use")
        message = "An account with this email already exists.";
      else if (error.code === "auth/invalid-email")
        message = "Invalid email address.";
      else if (error.code === "auth/weak-password")
        message = "Password is too weak.";
      setErrors({ general: message });
    }
    setLoading(false);
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;
  const passwordChecks = validatePassword(password);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🌿</Text>
          </View>
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.tagline}>Start your wellness journey today</Text>
        </View>

        <View style={styles.card}>
          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {errors.general}</Text>
            </View>
          )}

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <View
            style={[
              styles.inputWrapper,
              errors.name && styles.inputWrapperError,
            ]}
          >
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="John Smith"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={handleNameChange}
              autoCapitalize="words"
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View
            style={[
              styles.inputWrapper,
              errors.email && styles.inputWrapperError,
            ]}
          >
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((p) => ({ ...p, email: null }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Age */}
          <Text style={styles.label}>Age</Text>
          <View
            style={[
              styles.inputWrapper,
              errors.age && styles.inputWrapperError,
            ]}
          >
            <Text style={styles.inputIcon}>🎂</Text>
            <TextInput
              style={styles.input}
              placeholder="Your age (13-120)"
              placeholderTextColor={theme.colors.textMuted}
              value={age}
              onChangeText={handleAgeChange}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}

          {/* Gender */}
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {["Male", "Female", "Other"].map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderBtn,
                  gender === g && styles.genderBtnActive,
                ]}
                onPress={() => {
                  setGender(g);
                  if (errors.gender) setErrors((p) => ({ ...p, gender: null }));
                }}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === g && styles.genderTextActive,
                  ]}
                >
                  {g === "Male"
                    ? "♂ Male"
                    : g === "Female"
                      ? "♀ Female"
                      : "⚧ Other"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.gender && (
            <Text style={styles.errorText}>{errors.gender}</Text>
          )}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View
            style={[
              styles.inputWrapper,
              errors.password && styles.inputWrapperError,
            ]}
          >
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a strong password"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password)
                  setErrors((p) => ({ ...p, password: null }));
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}

          {/* Password Strength Meter */}
          {password.length > 0 && passwordStrength && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: passwordStrength.width,
                      backgroundColor: passwordStrength.color,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.strengthLabel,
                  { color: passwordStrength.color },
                ]}
              >
                {passwordStrength.label}
              </Text>
            </View>
          )}

          {/* Password Requirements Checklist */}
          {password.length > 0 && (
            <View style={styles.requirementsBox}>
              {[
                { key: "length", label: "At least 8 characters" },
                { key: "uppercase", label: "One uppercase letter (A-Z)" },
                { key: "number", label: "One number (0-9)" },
                { key: "special", label: "One special character (!@#$%)" },
              ].map((req) => (
                <View key={req.key} style={styles.requirementRow}>
                  <Text
                    style={[
                      styles.requirementIcon,
                      {
                        color: passwordChecks[req.key]
                          ? theme.colors.primary
                          : theme.colors.textMuted,
                      },
                    ]}
                  >
                    {passwordChecks[req.key] ? "✓" : "○"}
                  </Text>
                  <Text
                    style={[
                      styles.requirementText,
                      {
                        color: passwordChecks[req.key]
                          ? theme.colors.primary
                          : theme.colors.textMuted,
                      },
                    ]}
                  >
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View
            style={[
              styles.inputWrapper,
              errors.confirmPassword && styles.inputWrapperError,
            ]}
          >
            <Text style={styles.inputIcon}>🔐</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor={theme.colors.textMuted}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword)
                  setErrors((p) => ({ ...p, confirmPassword: null }));
              }}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeIcon}>
                {showConfirmPassword ? "🙈" : "👁️"}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}

          {/* Password Match Indicator */}
          {confirmPassword.length > 0 && (
            <Text
              style={{
                fontSize: theme.fontSize.xs,
                color:
                  password === confirmPassword
                    ? theme.colors.primary
                    : theme.colors.error,
                marginBottom: 8,
                marginLeft: 4,
              }}
            >
              {password === confirmPassword
                ? "✓ Passwords match"
                : "✗ Passwords do not match"}
            </Text>
          )}

          {/* GDPR Consent */}
          <TouchableOpacity
            style={[
              styles.consentRow,
              errors.consent && styles.consentRowError,
            ]}
            onPress={() => {
              setConsentGiven(!consentGiven);
              if (errors.consent) setErrors((p) => ({ ...p, consent: null }));
            }}
          >
            <View
              style={[styles.checkbox, consentGiven && styles.checkboxActive]}
            >
              {consentGiven && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              I agree to the secure storage and processing of my personal data
              for personalized wellness recommendations. Data will not be shared
              with third parties. I can request deletion at any time. (GDPR
              2018)
            </Text>
          </TouchableOpacity>
          {errors.consent && (
            <Text style={styles.errorText}>{errors.consent}</Text>
          )}

          {/* Privacy Notice */}
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyTitle}>🔒 Your Privacy Matters</Text>
            <Text style={styles.privacyText}>
              • Data encrypted with HTTPS/TLS
            </Text>
            <Text style={styles.privacyText}>
              • Passwords hashed by Firebase Auth
            </Text>
            <Text style={styles.privacyText}>
              • No data sold to third parties
            </Text>
            <Text style={styles.privacyText}>
              • Delete your account anytime
            </Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.linkText}>Already have an account? </Text>
            <Text style={styles.linkBold}>Sign in</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.bottomNote}>
          🔒 Your data is encrypted and secure
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 60,
  },

  headerSection: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 24,
    maxWidth: 480,
    alignSelf: "center",
    width: "100%",
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryUltraLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    ...theme.shadow.small,
  },
  logoEmoji: { fontSize: 36 },
  appName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 4,
  },
  tagline: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },

  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: 24,
    maxWidth: 480,
    alignSelf: "center",
    width: "100%",
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

  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    marginBottom: 4,
    height: 52,
  },
  inputWrapperError: { borderColor: theme.colors.error },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    height: "100%",
  },
  eyeIcon: { fontSize: 18, padding: 4 },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginBottom: 8,
    marginLeft: 4,
  },

  genderRow: { flexDirection: "row", marginBottom: 4 },
  genderBtn: {
    flex: 1,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    backgroundColor: theme.colors.background,
    marginRight: 8,
  },
  genderBtnActive: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderColor: theme.colors.primary,
  },
  genderText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
    fontSize: theme.fontSize.sm,
  },
  genderTextActive: { color: theme.colors.primary },

  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  strengthBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 8,
  },
  strengthFill: { height: "100%", borderRadius: 3 },
  strengthLabel: { fontSize: theme.fontSize.xs, fontWeight: "700", width: 50 },

  requirementsBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  requirementIcon: { fontSize: 14, marginRight: 8, fontWeight: "bold" },
  requirementText: { fontSize: theme.fontSize.xs },

  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 4,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  consentRowError: { borderColor: theme.colors.error },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxActive: { backgroundColor: theme.colors.primary },
  checkmark: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  consentText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    flex: 1,
    lineHeight: 17,
  },

  privacyNotice: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  privacyTitle: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: theme.fontSize.sm,
    marginBottom: 8,
  },
  privacyText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
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

  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  linkText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  linkBold: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: theme.fontSize.sm,
  },

  bottomNote: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginBottom: 16,
    maxWidth: 480,
    alignSelf: "center",
  },
});
