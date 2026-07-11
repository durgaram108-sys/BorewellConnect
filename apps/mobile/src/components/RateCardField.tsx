import React from "react";
import { Text, TextInput, View } from "react-native";
import { c, font } from "../theme";
import { bandLabel } from "../utils/pricing";

/** Fixed 20-slot depth-band rate grid (1-100ft ... 1901-2000ft). Slots are filled top-down; a gap ends coverage. */
export function RateCardField({
  values,
  onChange,
  bandCount,
}: {
  values: (number | undefined)[];
  onChange: (values: (number | undefined)[]) => void;
  bandCount: number;
}) {
  const setBand = (index: number, text: string) => {
    const next = [...values];
    const n = Number(text);
    next[index] = text.trim() === "" || isNaN(n) ? undefined : n;
    onChange(next);
  };

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
      {Array.from({ length: bandCount }, (_, i) => (
        <View key={i} style={{ width: "47%" }}>
          <Text style={{ fontSize: 11, fontFamily: font.semibold, color: c.muted, marginBottom: 4 }}>{bandLabel(i)}</Text>
          <TextInput
            value={values[i] != null ? String(values[i]) : ""}
            onChangeText={(t) => setBand(i, t)}
            keyboardType="number-pad"
            placeholder="₹/ft"
            placeholderTextColor={c.mutedLight}
            style={{
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              fontSize: 14,
              fontFamily: font.regular,
              color: c.text,
              backgroundColor: "#fff",
            }}
          />
        </View>
      ))}
    </View>
  );
}
