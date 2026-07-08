import React from "react";
import { Image, ImageBackground, Pressable, Text, View, useWindowDimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { c, font } from "../theme";
import type { RootStackParams } from "../navigation";

const heroImage = require("../../assets/borewell-hero.jpg");

const WIDE_BREAKPOINT = 820;
const CONTENT_MAX_WIDTH = 380;

export function RoleSelect({ navigation }: NativeStackScreenProps<RootStackParams, "RoleSelect">) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const content = (
    <View style={{ width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" }}>
      <View style={{ alignItems: "center", marginBottom: 48 }}>
        <Text style={{ fontSize: 30, fontFamily: font.extrabold, color: "#fff", letterSpacing: 0.5 }}>BOREWELL</Text>
        <Text style={{ fontSize: 30, fontFamily: font.extrabold, color: c.greenLight, letterSpacing: 0.5, marginTop: -6 }}>
          CONNECT
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.9)",
            marginTop: 14,
            maxWidth: 260,
            textAlign: "center",
            fontFamily: font.regular,
          }}
        >
          Connecting customers with trusted borewell companies
        </Text>
      </View>

      <Pressable
        onPress={() => navigation.navigate("Customer")}
        style={{ backgroundColor: c.green, borderRadius: 12, paddingVertical: 16, alignItems: "center" }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontFamily: font.bold }}>Customer Login</Text>
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate("Owner")}
        style={{
          backgroundColor: "rgba(255,255,255,0.12)",
          borderWidth: 1.5,
          borderColor: "rgba(255,255,255,0.5)",
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: "center",
          marginTop: 14,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontFamily: font.bold }}>Borewell Owner Login</Text>
      </Pressable>
    </View>
  );

  if (isWide) {
    return (
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: c.navy }}>
        <Image source={heroImage} resizeMode="cover" style={{ width: "45%", height: "100%" }} />
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 48 }}>{content}</View>
      </View>
    );
  }

  return (
    <ImageBackground source={heroImage} resizeMode="cover" style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "rgba(11,42,74,0.72)", padding: 28, justifyContent: "center" }}>
        {content}
      </View>
    </ImageBackground>
  );
}
