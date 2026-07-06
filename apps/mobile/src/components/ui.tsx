import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
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
          <Text style={{ fontSize: 20, color: c.text }}>←</Text>
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
