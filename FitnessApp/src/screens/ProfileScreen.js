import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  deleteUser,
} from "firebase/auth";
import { auth, db } from "../config/firebase";
import { theme } from "../config/theme";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [wellnessFocus, setWellnessFocus] = useState("");
  const [preferredActivities, setPreferredActivities] = useState([]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [pwErrors, setPwErrors] = useState({});
  const [pwSuccess, setPwSuccess] = useState("");

  // Delete account modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fitnessLevels = [
    { label: "🌱 Beginner", value: "beginner" },
    { label: "🔥 Intermediate", value: "intermediate" },
    { label: "⚡ Advanced", value: "advanced" },
  ];

  const genders = [
    { label: "♂ Male", value: "Male" },
    { label: "♀ Female", value: "Female" },
    { label: "⚧ Other", value: "Other" },
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
    { label: "🧘 Mental Calm", value: "mental_calm" },
    { label: "💪 Physical", value: "physical_strength" },
    { label: "⚖️ Balanced", value: "balanced" },
    { label: "😴 Better Rest", value: "better_rest" },
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
        setName(data.name || "");
        setAge(data.age?.toString() || "");
        setGender(data.gender || "");
        setFitnessLevel(data.fitnessLevel || "");
        setWellnessFocus(data.wellnessFocus || "");
        setPreferredActivities(data.preferredActivities || []);
      }
    } catch (error) {
      console.log("fetchProfile error:", error.code);
    }
    setLoading(false);
  };

  const handleNameChange = (text) => {
    const lettersOnly = text.replace(/[^a-zA-Z\s]/g, "");
    setName(lettersOnly);
    if (errors.name) setErrors((p) => ({ ...p, name: null }));
  };

  const handleAgeChange = (text) => {
    const numeric = text.replace(/[^0-9]/g, "");
    setAge(numeric);
    if (errors.age) setErrors((p) => ({ ...p, age: null }));
  };

  const validateProfile = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    else if (name.trim().length < 2)
      newErrors.name = "Name must be at least 2 characters";
    if (!age) newErrors.age = "Age is required";
    else if (parseInt(age) < 13 || parseInt(age) > 120)
      newErrors.age = "Age must be between 13 and 120";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = (pwd) => ({
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
  });

  const handleSave = async () => {
    if (!validateProfile()) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      await updateDoc(doc(db, "users", user.uid), {
        name: name.trim(),
        age: parseInt(age),
        gender,
        fitnessLevel,
        wellnessFocus,
        preferredActivities,
        updatedAt: new Date().toISOString(),
      });
      setSuccessMsg("✅ Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      setErrors({ general: "Failed to save profile. Please try again." });
      console.log("saveProfile error:", error.code);
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    const newErrors = {};
    if (!currentPassword)
      newErrors.currentPassword = "Current password is required";
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else {
      const checks = validatePassword(newPassword);
      if (!checks.length)
        newErrors.newPassword = "Must be at least 8 characters";
      else if (!checks.uppercase)
        newErrors.newPassword = "Must contain an uppercase letter";
      else if (!checks.number) newErrors.newPassword = "Must contain a number";
      else if (!checks.special)
        newErrors.newPassword = "Must contain a special character";
    }
    if (!confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    else if (newPassword !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    setPwErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    setPwSuccess("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPwSuccess("✅ Password changed successfully!");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwErrors({});
      setTimeout(() => setPwSuccess(""), 3000);
    } catch (error) {
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setPwErrors({ currentPassword: "Current password is incorrect" });
      } else {
        setPwErrors({
          general: "Failed to update password. Please try again.",
        });
      }
      console.log("changePassword error:", error.code);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            console.log("logout error:", error.code);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    setDeletePassword("");
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Please enter your password to confirm deletion");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      const user = auth.currentUser;
      if (!user) return;

      const credential = EmailAuthProvider.credential(
        user.email,
        deletePassword,
      );
      await reauthenticateWithCredential(user, credential);

      // Delete all user data from Firestore
      const collections = [
        "workouts",
        "meals",
        "moods",
        "goals",
        "recommendations",
        "mindfulness",
      ];
      for (const col of collections) {
        const snap = await getDocs(
          query(collection(db, col), where("user_id", "==", user.uid)),
        );
        const deletePromises = snap.docs.map((d) =>
          deleteDoc(doc(db, col, d.id)),
        );
        await Promise.all(deletePromises);
      }

      // Delete user profile document
      await deleteDoc(doc(db, "users", user.uid));

      // Delete Firebase Auth account
      await deleteUser(user);
    } catch (error) {
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setDeleteError("Incorrect password. Account not deleted.");
      } else {
        setDeleteError("Failed to delete account. Please try again.");
      }
      console.log("deleteAccount error:", error.code);
      setDeleting(false);
    }
  };

  const toggleActivity = (activity) => {
    setPreferredActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity],
    );
  };

  const getFitnessLevelInfo = () => {
    const map = {
      beginner: { label: "🌱 Beginner", color: "#52B788", bg: "#D8F3DC" },
      intermediate: {
        label: "🔥 Intermediate",
        color: "#F4A261",
        bg: "#FEF0E6",
      },
      advanced: { label: "⚡ Advanced", color: "#E76F51", bg: "#FDE8E4" },
    };
    return (
      map[fitnessLevel] || {
        label: "🏃 Fitness User",
        color: theme.colors.primary,
        bg: theme.colors.primaryUltraLight,
      }
    );
  };

  const pwChecks = validatePassword(newPassword);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const flInfo = getFitnessLevelInfo();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {name ? name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
        <Text style={styles.profileName}>{name || "User"}</Text>
        <Text style={styles.profileEmail}>{auth.currentUser?.email}</Text>
        <View
          style={[
            styles.fitnessBadge,
            { backgroundColor: "rgba(255,255,255,0.2)" },
          ]}
        >
          <Text style={styles.fitnessBadgeText}>{flInfo.label}</Text>
        </View>
      </View>

      {pwSuccess ? (
        <View style={styles.globalSuccess}>
          <Text style={styles.globalSuccessText}>{pwSuccess}</Text>
        </View>
      ) : null}

      {/* Account Info */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        {[
          { label: "Email", value: auth.currentUser?.email || "N/A" },
          {
            label: "Member Since",
            value: userData?.createdAt
              ? userData.createdAt.split("T")[0]
              : "N/A",
          },
          {
            label: "Onboarding",
            value: userData?.onboardingDone ? "✅ Complete" : "⏳ Pending",
            green: true,
          },
          {
            label: "GDPR Consent",
            value: userData?.gdpr_consent ? "✅ Given" : "❌ Not given",
            green: !!userData?.gdpr_consent,
          },
        ].map((item, i) => (
          <View
            key={i}
            style={[styles.infoRow, i === 3 && { borderBottomWidth: 0 }]}
          >
            <Text style={styles.infoLabel}>{item.label}</Text>
            <Text
              style={[
                styles.infoValue,
                item.green && { color: theme.colors.primary },
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Personal Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
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

        <Text style={styles.label}>
          Full Name <Text style={styles.required}>*</Text>
        </Text>
        <View
          style={[styles.inputWrapper, errors.name && styles.inputWrapperError]}
        >
          <Text style={styles.inputIcon}>👤</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Your full name"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="words"
          />
        </View>
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        <Text style={styles.label}>
          Age <Text style={styles.required}>*</Text>
        </Text>
        <View
          style={[styles.inputWrapper, errors.age && styles.inputWrapperError]}
        >
          <Text style={styles.inputIcon}>🎂</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={handleAgeChange}
            placeholder="Your age"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
        {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}

        <Text style={styles.label}>Gender</Text>
        <View style={styles.chipsRow}>
          {genders.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[styles.chip, gender === g.value && styles.chipActive]}
              onPress={() => setGender(g.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  gender === g.value && styles.chipTextActive,
                ]}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>💾 Save Profile</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Fitness Profile */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Fitness Profile</Text>

        <Text style={styles.label}>Fitness Level</Text>
        <View style={styles.chipsRow}>
          {fitnessLevels.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.chip,
                fitnessLevel === level.value && styles.chipActive,
              ]}
              onPress={() => setFitnessLevel(level.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  fitnessLevel === level.value && styles.chipTextActive,
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Wellness Focus</Text>
        <View style={styles.chipsRow}>
          {wellnessFocuses.map((focus) => (
            <TouchableOpacity
              key={focus.value}
              style={[
                styles.chip,
                wellnessFocus === focus.value && styles.chipActive,
              ]}
              onPress={() => setWellnessFocus(focus.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  wellnessFocus === focus.value && styles.chipTextActive,
                ]}
              >
                {focus.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Preferred Activities</Text>
        <View style={styles.chipsRow}>
          {activities.map((activity) => (
            <TouchableOpacity
              key={activity}
              style={[
                styles.chip,
                preferredActivities.includes(activity) && styles.chipActive,
              ]}
              onPress={() => toggleActivity(activity)}
            >
              <Text
                style={[
                  styles.chipText,
                  preferredActivities.includes(activity) &&
                    styles.chipTextActive,
                ]}
              >
                {activity}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>💾 Save Fitness Profile</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Change Password */}
      <TouchableOpacity
        style={styles.passwordToggleBtn}
        onPress={() => {
          setShowPasswordForm(!showPasswordForm);
          setPwErrors({});
        }}
      >
        <Text style={styles.passwordToggleText}>
          🔒 {showPasswordForm ? "Cancel Password Change" : "Change Password"}
        </Text>
      </TouchableOpacity>

      {showPasswordForm && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          {pwErrors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {pwErrors.general}</Text>
            </View>
          )}

          <Text style={styles.label}>Current Password</Text>
          <View
            style={[
              styles.inputWrapper,
              pwErrors.currentPassword && styles.inputWrapperError,
            ]}
          >
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (pwErrors.currentPassword)
                  setPwErrors((p) => ({ ...p, currentPassword: null }));
              }}
              placeholder="Your current password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showCurrentPw}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)}>
              <Text style={styles.eyeIcon}>{showCurrentPw ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>
          {pwErrors.currentPassword && (
            <Text style={styles.errorText}>{pwErrors.currentPassword}</Text>
          )}

          <Text style={styles.label}>New Password</Text>
          <View
            style={[
              styles.inputWrapper,
              pwErrors.newPassword && styles.inputWrapperError,
            ]}
          >
            <Text style={styles.inputIcon}>🔑</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (pwErrors.newPassword)
                  setPwErrors((p) => ({ ...p, newPassword: null }));
              }}
              placeholder="New password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showNewPw}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)}>
              <Text style={styles.eyeIcon}>{showNewPw ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>
          {pwErrors.newPassword && (
            <Text style={styles.errorText}>{pwErrors.newPassword}</Text>
          )}

          {newPassword.length > 0 && (
            <View style={styles.requirementsBox}>
              {[
                { key: "length", label: "At least 8 characters" },
                { key: "uppercase", label: "One uppercase letter" },
                { key: "number", label: "One number" },
                { key: "special", label: "One special character" },
              ].map((req) => (
                <View key={req.key} style={styles.requirementRow}>
                  <Text
                    style={{
                      color: pwChecks[req.key]
                        ? theme.colors.primary
                        : theme.colors.textMuted,
                      marginRight: 8,
                      fontWeight: "bold",
                    }}
                  >
                    {pwChecks[req.key] ? "✓" : "○"}
                  </Text>
                  <Text
                    style={{
                      color: pwChecks[req.key]
                        ? theme.colors.primary
                        : theme.colors.textMuted,
                      fontSize: 12,
                    }}
                  >
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.label}>Confirm New Password</Text>
          <View
            style={[
              styles.inputWrapper,
              pwErrors.confirmPassword && styles.inputWrapperError,
            ]}
          >
            <Text style={styles.inputIcon}>🔐</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (pwErrors.confirmPassword)
                  setPwErrors((p) => ({ ...p, confirmPassword: null }));
              }}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showConfirmPw}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirmPw(!showConfirmPw)}>
              <Text style={styles.eyeIcon}>{showConfirmPw ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>
          {pwErrors.confirmPassword && (
            <Text style={styles.errorText}>{pwErrors.confirmPassword}</Text>
          )}

          {confirmPassword.length > 0 && (
            <Text
              style={{
                fontSize: 12,
                marginBottom: 8,
                marginLeft: 4,
                color:
                  newPassword === confirmPassword
                    ? theme.colors.primary
                    : theme.colors.error,
              }}
            >
              {newPassword === confirmPassword
                ? "✓ Passwords match"
                : "✗ Passwords do not match"}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleChangePassword}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>🔒 Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.divider} />

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutBtnText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Wellness & Fitness App v1.0</Text>

      {/* Delete Account */}
      <TouchableOpacity
        style={styles.deleteAccountBtn}
        onPress={handleDeleteAccount}
      >
        <Text style={styles.deleteAccountText}>🗑️ Delete My Account</Text>
      </TouchableOpacity>
      <Text style={styles.deleteAccountNote}>
        Permanently deletes all your data. Cannot be undone.
      </Text>

      {/* ── DELETE ACCOUNT MODAL ── works on iOS, Android and Web ── */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Icon */}
            <View style={styles.modalIconBg}>
              <Text style={styles.modalIcon}>⚠️</Text>
            </View>

            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              This will permanently delete your account and ALL your data
              including workouts, meals, moods, goals and recommendations.
              {"\n\n"}This action cannot be undone.
            </Text>

            {/* Password Input */}
            <Text style={styles.modalLabel}>
              Enter your password to confirm:
            </Text>
            <View
              style={[
                styles.modalInputWrapper,
                deleteError && styles.inputWrapperError,
              ]}
            >
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.modalInput}
                value={deletePassword}
                onChangeText={(text) => {
                  setDeletePassword(text);
                  if (deleteError) setDeleteError("");
                }}
                placeholder="Your password"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry={!showDeletePw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowDeletePw(!showDeletePw)}>
                <Text style={styles.eyeIcon}>{showDeletePw ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
            {deleteError ? (
              <Text style={styles.modalError}>{deleteError}</Text>
            ) : null}

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteBtn, deleting && { opacity: 0.7 }]}
                onPress={confirmDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: { color: theme.colors.textSecondary, marginTop: 12 },

  header: {
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    padding: 32,
    paddingTop: 40,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { color: "#fff", fontSize: 36, fontWeight: "700" },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: theme.colors.primaryPastel,
    marginBottom: 10,
  },
  fitnessBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  fitnessBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  globalSuccess: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  globalSuccessText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },

  infoCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...theme.shadow.small,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: { color: theme.colors.textSecondary, fontSize: 14 },
  infoValue: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  sectionCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    ...theme.shadow.medium,
  },
  sectionTitle: {
    fontSize: 16,
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
    marginTop: 4,
  },
  required: { color: theme.colors.error },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginBottom: 8,
    marginLeft: 4,
  },

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
  eyeIcon: { fontSize: 18, padding: 4 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderColor: theme.colors.primary,
  },
  chipText: { color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: theme.colors.primary },

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

  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    ...theme.shadow.small,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    color: "#fff",
    fontSize: theme.fontSize.lg,
    fontWeight: "700",
  },

  passwordToggleBtn: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    ...theme.shadow.small,
  },
  passwordToggleText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.errorLight,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.error,
    ...theme.shadow.small,
  },
  logoutIcon: { fontSize: 20, marginRight: 10 },
  logoutBtnText: { color: theme.colors.error, fontWeight: "700", fontSize: 16 },

  versionText: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },

  deleteAccountBtn: {
    borderRadius: theme.borderRadius.md,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: "transparent",
  },
  deleteAccountText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: "600",
  },
  deleteAccountNote: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: 11,
    marginHorizontal: 16,
    marginBottom: 8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    ...theme.shadow.medium,
  },
  modalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.errorLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalIcon: { fontSize: 32 },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  modalInputWrapper: {
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
  modalInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    height: "100%",
  },
  modalError: {
    color: theme.colors.error,
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  modalButtons: { flexDirection: "row", marginTop: 20 },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginRight: 10,
  },
  modalCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 15,
  },
  modalDeleteBtn: {
    flex: 1,
    padding: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: theme.colors.error,
  },
  modalDeleteText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
