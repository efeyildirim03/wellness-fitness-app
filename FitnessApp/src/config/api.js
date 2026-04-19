import { Platform } from "react-native";

export const FLASK_URL = "https://wellness-fitness-app-production.up.railway.app";  

export const API = {
  recommendations: `${FLASK_URL}/api/recommendations`,
  progress: `${FLASK_URL}/api/progress`,
  motivation: `${FLASK_URL}/api/motivation`,
  foodSearch: `${FLASK_URL}/api/food-search`,
  foodNutrients: `${FLASK_URL}/api/food-nutrients`,
};

export const apiCall = async (endpoint, method = "GET", body = null) => {
  try {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${FLASK_URL}${endpoint}`, options);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    if (
      error.message.includes("Network request failed") ||
      error.message.includes("fetch")
    ) {
      return {
        success: false,
        error: "Cannot connect to server. Make sure Flask is running.",
        offline: true,
      };
    }
    return { success: false, error: error.message };
  }
};

export const checkServerHealth = async () => {
  try {
    const response = await fetch(`${FLASK_URL}/`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
};
