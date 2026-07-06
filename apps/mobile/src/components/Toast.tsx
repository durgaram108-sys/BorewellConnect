import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { c, font } from "../theme";

type Listener = (message: string) => void;
let listeners: Listener[] = [];

/** Fire-and-forget success/confirmation toast. Call from anywhere, no props needed. */
export function showToast(message: string) {
  listeners.forEach((l) => l(message));
}

/** Mount once near the app root — renders whatever showToast() was last called with. */
export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: Listener = (msg) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMessage(msg);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMessage(null));
      }, 2200);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: c.navy,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontFamily: font.semibold,
    textAlign: "center",
  },
});
