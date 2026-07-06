import React, { useEffect, useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, setCustomerToken, CustomerProfile } from "../../api";
import { showToast } from "../../components/Toast";
import { c, font } from "../../theme";
import { Field, FieldLabel, LoadingScreen, PrimaryButton, ErrorText, ScreenTitle } from "../../components/ui";
import type { CustomerStackParams } from "../../navigation";

const completeProfileSchema = z.object({
  name: z.string().min(1, "Enter your name"),
  address: z.string().min(1, "Enter your address"),
});
type CompleteProfileForm = z.infer<typeof completeProfileSchema>;

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
      const { token, isNew } = await api.customerVerifyOtp(phone, code);
      await setCustomerToken(token);
      navigation.reset({
        index: isNew ? 1 : 0,
        routes: isNew ? [{ name: "CustomerHome" }, { name: "CompleteProfile" }] : [{ name: "CustomerHome" }],
      });
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

export function CompleteProfile({ navigation }: NativeStackScreenProps<CustomerStackParams, "CompleteProfile">) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.customerProfile().then(setProfile);
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileForm>({
    resolver: zodResolver(completeProfileSchema),
    values: profile ? { name: profile.name ?? "", address: profile.address ?? "" } : undefined,
  });

  const save = async (data: CompleteProfileForm) => {
    setBusy(true);
    setError("");
    try {
      await api.updateCustomerProfile({ name: data.name.trim(), address: data.address.trim() });
      showToast("Profile saved");
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  if (!profile) return <LoadingScreen />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Complete Your Profile" onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 13, color: c.muted, marginBottom: 18, fontFamily: font.regular }}>
        A few details so borewell companies and support can reach you correctly.
      </Text>
      <FieldLabel>FULL NAME</FieldLabel>
      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} placeholder="e.g. Ramesh Reddy" />}
      />
      <ErrorText>{errors.name?.message}</ErrorText>
      <FieldLabel>ADDRESS</FieldLabel>
      <Controller
        control={control}
        name="address"
        render={({ field: { value, onChange } }) => (
          <Field
            value={value}
            onChangeText={onChange}
            placeholder="e.g. 12-3-45 Main Road, Patancheru"
            multiline
            style={{ minHeight: 80, textAlignVertical: "top", marginBottom: 8 }}
          />
        )}
      />
      <ErrorText>{errors.address?.message}</ErrorText>
      <Text style={{ fontSize: 12, color: c.mutedLight, marginBottom: 14, fontFamily: font.regular }}>
        Mobile: +91 {profile.phone}
      </Text>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Save & Continue" onPress={handleSubmit(save)} busy={busy} />
    </ScrollView>
  );
}
