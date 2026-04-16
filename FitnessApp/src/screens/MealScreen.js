import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { FLASK_URL } from "../config/api";
import { theme } from "../config/theme";

export default function MealScreen() {
  const [mealType, setMealType] = useState("");
  const [loading, setLoading] = useState(false);
  const [meals, setMeals] = useState([]);
  const [todayTotals, setTodayTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState("100");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [calculatedMacros, setCalculatedMacros] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  const mealTypes = [
    { label: "🌅 Breakfast", value: "Breakfast" },
    { label: "☀️ Lunch", value: "Lunch" },
    { label: "🌙 Dinner", value: "Dinner" },
    { label: "🍎 Snack", value: "Snack" },
  ];

  useEffect(() => {
    fetchMeals();
  }, []);

  useEffect(() => {
    if (selectedFood && quantity) {
      const qty = parseFloat(quantity);
      if (!isNaN(qty) && qty > 0) {
        calculateMacros(selectedFood, qty);
      }
    }
  }, [selectedFood, quantity]);

  const calculateMacros = (food, qty) => {
    const ratio = qty / 100;
    setCalculatedMacros({
      calories: Math.round(food.calories_per_100g * ratio),
      protein: Math.round(food.protein_per_100g * ratio * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * ratio * 10) / 10,
      fats: Math.round(food.fats_per_100g * ratio * 10) / 10,
    });
  };

  const fetchMeals = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const snap = await getDocs(
        query(collection(db, "meals"), where("user_id", "==", user.uid)),
      );
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMeals(data);

      const todayMeals = data.filter((m) => m.date === today);
      const totals = todayMeals.reduce(
        (acc, m) => ({
          calories: acc.calories + (m.calories_intake || 0),
          protein: acc.protein + (m.protein || 0),
          carbs: acc.carbs + (m.carbs || 0),
          fats: acc.fats + (m.fats || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 },
      );
      setTodayTotals(totals);
    } catch (error) {
      console.log("fetchMeals error:", error.code);
    }
  };

  const handleFoodSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    if (q.length < 2) {
      setErrors({ search: "Please enter at least 2 characters" });
      return;
    }
    setSearching(true);
    setSearchResults([]);
    setErrors({});
    try {
      const response = await fetch(
        `${FLASK_URL}/api/food-search?q=${encodeURIComponent(q)}`,
      );
      if (!response.ok) throw new Error("Search failed");
      const result = await response.json();
      if (result.success) {
        setSearchResults(result.data);
        if (result.data.length === 0) {
          setErrors({ search: "No foods found. Try a different search term." });
        }
      }
    } catch (error) {
      setErrors({
        search: "Could not search. Make sure the server is running.",
      });
      console.log("foodSearch error:", error.message);
    }
    setSearching(false);
  };

  const handleSelectFood = (food) => {
    setSelectedFood(food);
    setQuantity("100");
    setShowSearchModal(false);
    calculateMacros(food, 100);
    if (errors.food) setErrors((p) => ({ ...p, food: null }));
  };

  // Only allow numbers for quantity
  const handleQuantityChange = (text) => {
    const numeric = text.replace(/[^0-9]/g, "");
    setQuantity(numeric);
  };

  const validate = () => {
    const newErrors = {};
    if (!mealType) newErrors.mealType = "Please select a meal type";
    if (!selectedFood) newErrors.food = "Please search and select a food item";
    if (!quantity || parseInt(quantity) < 1)
      newErrors.quantity = "Please enter a valid quantity";
    else if (parseInt(quantity) > 5000)
      newErrors.quantity = "Quantity seems too large";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogMeal = async () => {
    if (!validate()) return;
    setLoading(true);
    setSuccessMsg("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      await addDoc(collection(db, "meals"), {
        user_id: user.uid,
        meal_type: mealType,
        food_items: selectedFood.name,
        food_brand: selectedFood.brand || "",
        quantity_g: parseInt(quantity) || 100,
        calories_intake: calculatedMacros.calories,
        protein: calculatedMacros.protein,
        carbs: calculatedMacros.carbs,
        fats: calculatedMacros.fats,
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      });

      setSuccessMsg("✅ Meal logged successfully!");
      setSelectedFood(null);
      setCalculatedMacros(null);
      setMealType("");
      setQuantity("100");
      setSearchQuery("");
      setErrors({});
      fetchMeals();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      setErrors({ general: "Failed to save meal. Please try again." });
      console.log("logMeal error:", error.code);
    }
    setLoading(false);
  };

  const macroColors = {
    calories: { color: "#E76F51", bg: "#FDE8E4", label: "Calories" },
    protein: {
      color: theme.colors.primary,
      bg: theme.colors.primaryUltraLight,
      label: "Protein",
    },
    carbs: { color: "#2196F3", bg: "#E3F2FD", label: "Carbs" },
    fats: { color: "#9C27B0", bg: "#F3E5F5", label: "Fats" },
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Log Meal</Text>
        <Text style={styles.subtitle}>Track your nutrition intake</Text>
      </View>

      {/* Today's Nutrition Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📊 Today's Nutrition</Text>
        <View style={styles.macroSummaryRow}>
          {Object.entries(macroColors).map(([key, mc]) => (
            <View
              key={key}
              style={[styles.macroSummaryItem, { backgroundColor: mc.bg }]}
            >
              <Text style={[styles.macroSummaryValue, { color: mc.color }]}>
                {Math.round(todayTotals[key])}
                {key !== "calories" ? "g" : ""}
              </Text>
              <Text style={[styles.macroSummaryLabel, { color: mc.color }]}>
                {mc.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

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

        {/* Meal Type */}
        <Text style={styles.label}>
          Meal Type <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.mealTypeRow}>
          {mealTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.mealTypeBtn,
                mealType === type.value && styles.mealTypeBtnActive,
              ]}
              onPress={() => {
                setMealType(type.value);
                if (errors.mealType)
                  setErrors((p) => ({ ...p, mealType: null }));
              }}
            >
              <Text
                style={[
                  styles.mealTypeBtnText,
                  mealType === type.value && styles.mealTypeBtnTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.mealType && (
          <Text style={styles.errorText}>{errors.mealType}</Text>
        )}

        {/* Food Search */}
        <Text style={styles.label}>
          Food Item <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.searchBar, errors.food && styles.searchBarError]}
          onPress={() => {
            setShowSearchModal(true);
            if (errors.food) setErrors((p) => ({ ...p, food: null }));
          }}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text
            style={[
              styles.searchBarText,
              selectedFood && styles.searchBarTextSelected,
            ]}
          >
            {selectedFood ? selectedFood.name : "Search USDA food database..."}
          </Text>
          {selectedFood && (
            <TouchableOpacity
              onPress={() => {
                setSelectedFood(null);
                setCalculatedMacros(null);
              }}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {errors.food && <Text style={styles.errorText}>{errors.food}</Text>}

        {/* Selected Food Details */}
        {selectedFood && calculatedMacros && (
          <View style={styles.selectedFoodCard}>
            <View style={styles.selectedFoodHeader}>
              <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
              {selectedFood.brand ? (
                <Text style={styles.selectedFoodBrand}>
                  {selectedFood.brand}
                </Text>
              ) : null}
            </View>

            <Text style={styles.label}>
              Quantity (grams) <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputWrapper,
                errors.quantity && styles.inputWrapperError,
              ]}
            >
              <Text style={styles.inputIcon}>⚖️</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="number-pad"
                placeholder="100"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={4}
              />
              <Text style={styles.inputSuffix}>grams</Text>
            </View>
            {errors.quantity && (
              <Text style={styles.errorText}>{errors.quantity}</Text>
            )}

            {/* Macros Display */}
            <Text style={styles.macrosTitle}>
              Nutritional values for {quantity}g:
            </Text>
            <View style={styles.macrosGrid}>
              {Object.entries(macroColors).map(([key, mc]) => (
                <View
                  key={key}
                  style={[styles.macroBox, { backgroundColor: mc.bg }]}
                >
                  <Text style={[styles.macroBoxValue, { color: mc.color }]}>
                    {calculatedMacros[key]}
                    {key !== "calories" ? "g" : ""}
                  </Text>
                  <Text style={[styles.macroBoxLabel, { color: mc.color }]}>
                    {mc.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Log Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogMeal}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>+ Log Meal</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Meals */}
      <Text style={styles.sectionTitle}>Recent Meals</Text>
      {meals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🥗</Text>
          <Text style={styles.emptyTitle}>No meals logged yet</Text>
          <Text style={styles.emptyText}>
            Search and log your first meal above!
          </Text>
        </View>
      ) : (
        meals.slice(0, 10).map((meal) => (
          <View key={meal.id} style={styles.mealCard}>
            <View style={styles.mealTypeTag}>
              <Text style={styles.mealTypeTagText}>{meal.meal_type}</Text>
            </View>
            <View style={styles.mealContent}>
              <View style={styles.mealTop}>
                <Text style={styles.mealFood}>{meal.food_items}</Text>
                <Text style={styles.mealCalories}>
                  {meal.calories_intake} kcal
                </Text>
              </View>
              <View style={styles.mealBottom}>
                <Text style={styles.mealDetail}>⚖️ {meal.quantity_g}g</Text>
                <Text style={styles.mealDetail}>P: {meal.protein}g</Text>
                <Text style={styles.mealDetail}>C: {meal.carbs}g</Text>
                <Text style={styles.mealDetail}>F: {meal.fats}g</Text>
                <Text style={styles.mealDate}>📅 {meal.date}</Text>
              </View>
            </View>
          </View>
        ))
      )}

      {/* Food Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Search Food</Text>
              <TouchableOpacity
                onPress={() => setShowSearchModal(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchRow}>
              <View style={styles.modalSearchInputWrapper}>
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="e.g. banana, chicken breast, oats..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (errors.search)
                      setErrors((p) => ({ ...p, search: null }));
                  }}
                  onSubmitEditing={handleFoodSearch}
                  autoFocus
                  autoCorrect={false}
                  maxLength={100}
                />
              </View>
              <TouchableOpacity
                style={styles.modalSearchBtn}
                onPress={handleFoodSearch}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSearchBtnText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>

            {errors.search && (
              <Text style={styles.searchErrorText}>{errors.search}</Text>
            )}

            <ScrollView style={styles.resultsContainer}>
              {searchResults.length === 0 && !searching && !errors.search && (
                <View style={styles.searchHint}>
                  <Text style={styles.searchHintEmoji}>🥦</Text>
                  <Text style={styles.searchHintTitle}>
                    Search the USDA Database
                  </Text>
                  <Text style={styles.searchHintText}>
                    Try: banana, chicken breast, brown rice, apple, whole egg
                  </Text>
                </View>
              )}
              {searchResults.map((food, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resultCard}
                  onPress={() => handleSelectFood(food)}
                >
                  <View style={styles.resultLeft}>
                    <Text style={styles.resultName}>{food.name}</Text>
                    {food.brand ? (
                      <Text style={styles.resultBrand}>{food.brand}</Text>
                    ) : null}
                    <Text style={styles.resultServing}>Per 100g</Text>
                  </View>
                  <View style={styles.resultRight}>
                    <Text style={styles.resultCalories}>
                      {food.calories_per_100g} kcal
                    </Text>
                    <Text style={styles.resultMacro}>
                      P: {food.protein_per_100g}g
                    </Text>
                    <Text style={styles.resultMacro}>
                      C: {food.carbs_per_100g}g
                    </Text>
                    <Text style={styles.resultMacro}>
                      F: {food.fats_per_100g}g
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

  summaryCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...theme.shadow.small,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  macroSummaryRow: { flexDirection: "row", justifyContent: "space-between" },
  macroSummaryItem: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 3,
  },
  macroSummaryValue: { fontSize: 18, fontWeight: "700" },
  macroSummaryLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },

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
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginBottom: 8,
    marginLeft: 4,
  },

  mealTypeRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  mealTypeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  mealTypeBtnActive: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderColor: theme.colors.primary,
  },
  mealTypeBtnText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  mealTypeBtnTextActive: { color: theme.colors.primary },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 4,
  },
  searchBarError: { borderColor: theme.colors.error },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchBarText: { flex: 1, color: theme.colors.textMuted, fontSize: 14 },
  searchBarTextSelected: { color: theme.colors.textPrimary, fontWeight: "600" },
  clearIcon: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: "bold",
    padding: 4,
  },

  selectedFoodCard: {
    backgroundColor: theme.colors.primaryUltraLight,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryPastel,
  },
  selectedFoodHeader: { marginBottom: 8 },
  selectedFoodName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  selectedFoodBrand: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.cardBackground,
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
  inputSuffix: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  macrosTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
    fontWeight: "600",
  },
  macrosGrid: { flexDirection: "row", justifyContent: "space-between" },
  macroBox: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 2,
  },
  macroBoxValue: { fontSize: 16, fontWeight: "700" },
  macroBoxLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },

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

  mealCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    overflow: "hidden",
    ...theme.shadow.small,
  },
  mealTypeTag: {
    backgroundColor: theme.colors.primaryUltraLight,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  mealTypeTagText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 11,
    textAlign: "center",
  },
  mealContent: { flex: 1, padding: 12 },
  mealTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  mealFood: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  mealCalories: { fontSize: 16, fontWeight: "700", color: "#E76F51" },
  mealBottom: { flexDirection: "row", flexWrap: "wrap" },
  mealDetail: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginRight: 10,
  },
  mealDate: { color: theme.colors.textMuted, fontSize: 11 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  modalCloseBtn: { padding: 8 },
  modalCloseBtnText: { color: theme.colors.textSecondary, fontSize: 20 },
  modalSearchRow: { flexDirection: "row", marginBottom: 8 },
  modalSearchInputWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginRight: 8,
    height: 48,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  modalSearchInput: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    height: "100%",
  },
  modalSearchBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 48,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSearchBtnText: { color: "#fff", fontWeight: "700" },
  searchErrorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.xs,
    marginBottom: 8,
  },
  resultsContainer: { flex: 1 },
  searchHint: { alignItems: "center", padding: 32 },
  searchHintEmoji: { fontSize: 48, marginBottom: 12 },
  searchHintTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  searchHintText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  resultCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultLeft: { flex: 1, marginRight: 8 },
  resultName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  resultBrand: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  resultServing: {
    color: theme.colors.primary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  resultRight: { alignItems: "flex-end" },
  resultCalories: { color: "#E76F51", fontWeight: "700", fontSize: 15 },
  resultMacro: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
