import React, { useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, setCustomerToken } from "../../api";
import { c, font } from "../../theme";
import { PrimaryButton, ErrorText, ScreenTitle } from "../../components/ui";
import type { CustomerStackParams } from "../../navigation";

const bg = require("../../../assets/login-borewell-bg.png");

export function CustomerLogin({ navigation }: NativeStackScreenProps<CustomerStackParams, "CustomerLogin">) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await api.customerRequestOtp(phone);
      navigation.navigate("CustomerOtp", { phone });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ImageBackground source={bg} resizeMode="cover" style={{ height: 340 }} imageStyle={{ opacity: 0.9 }}>
        <View style={{ flex: 1, backgroundColor: "rgba(11,42,74,0.5)", alignItems: "center", paddingTop: 84 }}>
          <Text style={{ fontSize: 26, fontFamily: font.extrabold, color: "#fff", letterSpacing: 0.5 }}>BOREWELL</Text>
          <Text style={{ fontSize: 26, fontFamily: font.extrabold, color: c.greenLight, letterSpacing: 0.5, marginTop: -6 }}>
            CONNECT
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.9)",
              marginTop: 14,
              maxWidth: 240,
              textAlign: "center",
              fontFamily: font.regular,
            }}
          >
            Connecting customers with trusted borewell companies
          </Text>
        </View>
      </ImageBackground>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 28, paddingTop: 28 }}>
          <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.muted, marginBottom: 6 }}>Mobile Number</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ fontFamily: font.bold, color: c.text }}>+91</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              style={{ flex: 1, fontSize: 16, fontFamily: font.regular, color: c.text }}
              placeholder="10-digit mobile number"
              placeholderTextColor={c.mutedLight}
            />
          </View>
          <ErrorText>{error}</ErrorText>
          <PrimaryButton title="Send OTP" onPress={send} busy={busy} style={{ marginTop: 22 }} />
          <Text style={{ fontSize: 11, color: c.mutedLight, textAlign: "center", marginTop: 16, fontFamily: font.regular }}>
            By continuing you agree to our Terms & Conditions
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function CustomerOtp({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "CustomerOtp">) {
  const { phone } = route.params;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      const { token } = await api.customerVerifyOtp(phone, code);
      await setCustomerToken(token);
      navigation.reset({ index: 0, routes: [{ name: "CustomerHome" }] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingTop: 24 }}>
      <ScreenTitle title="Enter OTP" onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>
        We've sent a 6-digit code to +91 {phone}
      </Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        style={{
          textAlign: "center",
          fontSize: 26,
          letterSpacing: 14,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          padding: 14,
          marginTop: 24,
          backgroundColor: "#fff",
          fontFamily: font.regular,
          color: c.text,
        }}
      />
      <Text style={{ fontSize: 12, color: c.mutedLight, textAlign: "center", marginTop: 14, fontFamily: font.regular }}>
        Resend OTP in 00:30
      </Text>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Verify OTP" onPress={verify} busy={busy} style={{ marginTop: 26 }} />
    </ScrollView>
  );
}
