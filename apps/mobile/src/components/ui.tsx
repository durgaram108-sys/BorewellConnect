import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { c, font } from "../theme";

export function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={c.navy} size="large" />
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  busy,
  outline,
  style,
}: {
  title: string;
  onPress?: () => void;
  busy?: boolean;
  outline?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        outline && styles.buttonOutline,
        pressed && { opacity: 0.85 },
        busy && { opacity: 0.7 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={outline ? c.navy : "#fff"} />
      ) : (
        <Text style={[styles.buttonText, outline && { color: c.navy }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={c.mutedLight} {...props} style={[styles.field, props.style]} />;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenTitle({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.titleRow}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10}>
          <Feather name="arrow-left" size={20} color={c.text} />
        </Pressable>
      )}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <Text style={{ color: c.danger, fontSize: 13, fontFamily: font.semibold, marginTop: 10 }}>{children}</Text>;
}

export function StripedPlaceholder({ label, style }: { label: string; style?: ViewStyle }) {
  return (
    <View style={[styles.striped, style]}>
      <Text style={styles.stripedLabel}>{label}</Text>
    </View>
  );
}

export function SkeletonBox({ style }: { style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: c.trackBg, borderRadius: 8, opacity }, style]} />;
}

/** Stacked card-shaped placeholders — for list screens (Quotations, Matched Requests, Active Jobs, etc.). */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.card, { marginBottom: 12 }]}>
          <SkeletonBox style={{ width: "50%", height: 16, marginBottom: 10 }} />
          <SkeletonBox style={{ width: "80%", height: 12, marginBottom: 6 }} />
          <SkeletonBox style={{ width: "35%", height: 12 }} />
        </View>
      ))}
    </View>
  );
}

/** Text-line-shaped placeholders — for single-record detail screens. */
export function SkeletonDetail() {
  return (
    <View>
      <SkeletonBox style={{ width: "60%", height: 20, marginBottom: 14 }} />
      <SkeletonBox style={{ width: "90%", height: 13, marginBottom: 8 }} />
      <SkeletonBox style={{ width: "75%", height: 13, marginBottom: 8 }} />
      <SkeletonBox style={{ width: "50%", height: 13, marginBottom: 22 }} />
      <SkeletonBox style={{ width: "100%", height: 90, borderRadius: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: c.green,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOutline: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: c.navy,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: font.bold,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: font.bold,
    color: c.muted,
    marginBottom: 6,
  },
  field: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: font.regular,
    backgroundColor: "#fff",
    marginBottom: 14,
    color: c.text,
  },
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: font.extrabold,
    color: c.text,
  },
  striped: {
    borderRadius: 12,
    backgroundColor: "#EFEDE8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stripedLabel: {
    fontFamily: "monospace" as never,
    fontSize: 11,
    color: c.muted,
    letterSpacing: 1,
  },
});
