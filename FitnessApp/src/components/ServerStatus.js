import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { checkServerHealth } from "../config/api";

export default function ServerStatus() {
  const [isOnline, setIsOnline] = useState(null);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    const online = await checkServerHealth();
    setIsOnline(online);
  };

  if (isOnline === null) return null;
  if (isOnline) return null;

  return (
    <TouchableOpacity style={styles.banner} onPress={checkHealth}>
      <Text style={styles.bannerText}>
        ⚠️ Recommendation engine offline — tap to retry
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#F44336",
    padding: 10,
    alignItems: "center",
  },
  bannerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
