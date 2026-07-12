import React, { useEffect, useState } from "react";
import { FlatList, Pressable, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { c, font } from "../theme";
import { ScreenTitle } from "../components/ui";
import { clearDebugLog, getDebugLog, LogEntry, subscribeDebugLog } from "../debugLog";
import type { RootStackParams } from "../navigation";

declare const process: { env: Record<string, string | undefined> };

function formatEntry(e: LogEntry) {
  const time = new Date(e.ts).toLocaleTimeString();
  return `[${time}] ${e.level.toUpperCase()} ${e.message}${e.detail ? `\n  ${e.detail}` : ""}`;
}

export function DebugLog({ navigation }: NativeStackScreenProps<RootStackParams, "DebugLog">) {
  const [logs, setLogs] = useState<LogEntry[]>(getDebugLog());

  useEffect(() => subscribeDebugLog(() => setLogs(getDebugLog())), []);

  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

  const share = () => {
    const text = `Borewell Connect debug log\nAPI: ${apiUrl}\n\n${logs.map(formatEntry).join("\n\n")}`;
    Share.share({ message: text || "No log entries yet." });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <ScreenTitle title="Debug Log" onBack={() => navigation.goBack()} />
        <Text style={{ fontSize: 12, color: c.muted, fontFamily: font.regular, marginTop: 4 }}>API: {apiUrl}</Text>

        <View style={{ flexDirection: "row", marginTop: 14, gap: 10 }}>
          <Pressable
            onPress={share}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: c.navy,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Feather name="share-2" size={14} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: font.semibold, fontSize: 13 }}>Share log</Text>
          </Pressable>
          <Pressable
            onPress={clearDebugLog}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: c.chipBg,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Feather name="trash-2" size={14} color={c.text} />
            <Text style={{ color: c.text, fontFamily: font.semibold, fontSize: 13 }}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 20, paddingTop: 14 }}
        ListEmptyComponent={
          <Text style={{ color: c.muted, fontFamily: font.regular, textAlign: "center", marginTop: 40 }}>
            No log entries yet. Use the app — API calls and errors will show up here.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: item.level === "error" ? "#F3D2CC" : c.border,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: font.semibold,
                color: item.level === "error" ? c.danger : c.text,
              }}
            >
              {new Date(item.ts).toLocaleTimeString()} · {item.message}
            </Text>
            {item.detail ? (
              <Text style={{ fontSize: 11, fontFamily: font.regular, color: c.muted, marginTop: 4 }}>{item.detail}</Text>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
