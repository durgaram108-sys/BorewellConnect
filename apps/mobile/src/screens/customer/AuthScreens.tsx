import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, setCustomerToken, CustomerProfile } from "../../api";
import { showToast } from "../../components/Toast";
import { c, font } from "../../theme";
import { Field, FieldLabel, LoadingScreen, PrimaryButton, ErrorText, ScreenTitle } from "../../components/ui";
import { SelectField, AutocompleteField } from "../../components/Picker";
import { DISTRICTS_BY_STATE, INDIA_STATES } from "../../data/indiaLocations";
import { LanguagePicker } from "../../components/LanguagePicker";
import { useTranslation } from "../../i18n/LanguageContext";
import type { CustomerStackParams } from "../../navigation";

function makeCompleteProfileSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t("completeProfile.nameRequired")),
    surname: z.string().optional(),
    address: z.string().min(1, t("completeProfile.addressRequired")),
    state: z.string().min(1, t("newRequest.stateRequired")),
    district: z.string().min(1, t("newRequest.districtRequired")),
    mandal: z.string().min(1, t("newRequest.mandalRequired")),
    village: z.string().optional(),
    pincode: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{6}$/.test(v), t("completeProfile.pincodeInvalid")),
  });
}
type CompleteProfileForm = z.infer<ReturnType<typeof makeCompleteProfileSchema>>;

const bg = require("../../../assets/login-borewell-bg.png");

const WIDE_BREAKPOINT = 820;
const CONTENT_MAX_WIDTH = 380;

export function CustomerLogin({ navigation }: NativeStackScreenProps<CustomerStackParams, "CustomerLogin">) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const { devHint } = await api.customerRequestOtp(phone);
      navigation.navigate("CustomerOtp", { phone, devHint });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("customerLogin.failedToSend"));
    } finally {
      setBusy(false);
    }
  };

  const titleBlock = (
    <>
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
        {t("roleSelect.tagline")}
      </Text>
    </>
  );

  const form = (
    <View style={{ width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" }}>
      <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.muted, marginBottom: 6 }}>
        {t("customerLogin.mobileNumber")}
      </Text>
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
          placeholder={t("customerLogin.mobilePlaceholder")}
          placeholderTextColor={c.mutedLight}
        />
      </View>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title={t("customerLogin.sendOtp")} onPress={send} busy={busy} style={{ marginTop: 22 }} />
      <Text style={{ fontSize: 11, color: c.mutedLight, textAlign: "center", marginTop: 16, fontFamily: font.regular }}>
        {t("customerLogin.terms")}
      </Text>
      <View style={{ alignItems: "center", marginTop: 20 }}>
        <LanguagePicker />
      </View>
    </View>
  );

  if (isWide) {
    return (
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: c.navy }}>
        <Image source={bg} resizeMode="cover" style={{ width: "45%", height: "100%" }} />
        <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center", paddingHorizontal: 48 }}>
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <Text style={{ fontSize: 26, fontFamily: font.extrabold, color: c.navy, letterSpacing: 0.5 }}>BOREWELL</Text>
            <Text style={{ fontSize: 26, fontFamily: font.extrabold, color: c.green, letterSpacing: 0.5, marginTop: -6 }}>
              CONNECT
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: c.muted,
                marginTop: 14,
                maxWidth: 260,
                textAlign: "center",
                fontFamily: font.regular,
              }}
            >
              {t("roleSelect.tagline")}
            </Text>
          </View>
          {form}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ImageBackground source={bg} resizeMode="cover" style={{ height: 340 }} imageStyle={{ opacity: 0.9 }}>
        <View style={{ flex: 1, backgroundColor: "rgba(11,42,74,0.5)", alignItems: "center", paddingTop: 84 }}>
          {titleBlock}
        </View>
      </ImageBackground>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 28, paddingTop: 28 }}>{form}</View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function CustomerOtp({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "CustomerOtp">) {
  const { phone, devHint } = route.params;
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const { t } = useTranslation();
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
      setError(e instanceof Error ? e.message : t("customerOtp.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={
        isWide
          ? { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 }
          : { padding: 20, paddingTop: 24 }
      }
    >
      <View style={{ width: "100%", maxWidth: CONTENT_MAX_WIDTH }}>
        <ScreenTitle title={t("customerOtp.title")} onBack={() => navigation.goBack()} />
        <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>
          {t("customerOtp.sentTo", { phone })}
        </Text>
        {devHint ? (
          <View
            style={{
              backgroundColor: "#FDF3DC",
              borderWidth: 1,
              borderColor: "#F0D48A",
              borderRadius: 10,
              padding: 12,
              marginTop: 14,
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: font.semibold, color: "#8A6416" }}>{devHint}</Text>
          </View>
        ) : null}
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
          {t("customerOtp.resend")}
        </Text>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton title={t("customerOtp.verify")} onPress={verify} busy={busy} style={{ marginTop: 26 }} />
      </View>
    </ScrollView>
  );
}

export function CompleteProfile({ navigation }: NativeStackScreenProps<CustomerStackParams, "CompleteProfile">) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.customerProfile().then(setProfile);
  }, []);

  const completeProfileSchema = useMemo(() => makeCompleteProfileSchema(t), [t]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompleteProfileForm>({
    resolver: zodResolver(completeProfileSchema),
    values: profile
      ? {
          name: profile.name ?? "",
          surname: profile.surname ?? "",
          address: profile.address ?? "",
          state: profile.state ?? "",
          district: profile.district ?? "",
          mandal: profile.mandal ?? "",
          village: profile.village ?? "",
          pincode: profile.pincode ?? "",
        }
      : undefined,
  });

  const selectedState = watch("state");
  const selectedDistrict = watch("district");
  const selectedMandal = watch("mandal");

  const [mandalSuggestions, setMandalSuggestions] = useState<string[]>([]);
  const [villageSuggestions, setVillageSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedState || !selectedDistrict) {
      setMandalSuggestions([]);
      return;
    }
    api.mandalSuggestions(selectedState, selectedDistrict).then(setMandalSuggestions).catch(() => {});
  }, [selectedState, selectedDistrict]);

  useEffect(() => {
    if (!selectedState || !selectedDistrict || !selectedMandal) {
      setVillageSuggestions([]);
      return;
    }
    api.villageSuggestions(selectedState, selectedDistrict, selectedMandal).then(setVillageSuggestions).catch(() => {});
  }, [selectedState, selectedDistrict, selectedMandal]);

  const save = async (data: CompleteProfileForm) => {
    setBusy(true);
    setError("");
    try {
      await api.updateCustomerProfile({
        name: data.name.trim(),
        surname: data.surname?.trim(),
        address: data.address.trim(),
        state: data.state,
        district: data.district,
        mandal: data.mandal.trim(),
        village: data.village?.trim(),
        pincode: data.pincode?.trim(),
      });
      showToast(t("completeProfile.saved"));
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("completeProfile.failedToSave"));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await setCustomerToken(null);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: "RoleSelect" }] });
  };

  if (!profile) return <LoadingScreen />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title={t("completeProfile.title")} onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 13, color: c.muted, marginBottom: 18, fontFamily: font.regular }}>
        {t("completeProfile.subtitle")}
      </Text>
      <FieldLabel>{t("completeProfile.fullName").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange } }) => (
          <Field value={value} onChangeText={onChange} placeholder={t("completeProfile.fullNamePlaceholder")} />
        )}
      />
      <ErrorText>{errors.name?.message}</ErrorText>
      <FieldLabel>{t("completeProfile.surname").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="surname"
        render={({ field: { value, onChange } }) => (
          <Field value={value} onChangeText={onChange} placeholder={t("completeProfile.surnamePlaceholder")} />
        )}
      />
      <FieldLabel>{t("completeProfile.address").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="address"
        render={({ field: { value, onChange } }) => (
          <Field
            value={value}
            onChangeText={onChange}
            placeholder={t("completeProfile.addressPlaceholder")}
            multiline
            style={{ minHeight: 80, textAlignVertical: "top", marginBottom: 8 }}
          />
        )}
      />
      <ErrorText>{errors.address?.message}</ErrorText>
      <FieldLabel>{t("newRequest.state").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="state"
        render={({ field: { value, onChange } }) => (
          <SelectField
            value={value}
            onChange={(v) => {
              onChange(v);
              setValue("district", "");
            }}
            options={INDIA_STATES}
            placeholder={t("newRequest.selectState")}
          />
        )}
      />
      <ErrorText>{errors.state?.message}</ErrorText>
      <FieldLabel>{t("newRequest.district").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="district"
        render={({ field: { value, onChange } }) => (
          <SelectField
            value={value}
            onChange={onChange}
            options={DISTRICTS_BY_STATE[selectedState] ?? []}
            placeholder={t("newRequest.selectDistrict")}
            disabledMessage={t("newRequest.selectStateFirst")}
          />
        )}
      />
      <ErrorText>{errors.district?.message}</ErrorText>
      <FieldLabel>{t("newRequest.mandal").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="mandal"
        render={({ field: { value, onChange } }) => (
          <AutocompleteField
            value={value}
            onChange={onChange}
            suggestions={mandalSuggestions}
            placeholder={t("newRequest.mandalPlaceholder")}
          />
        )}
      />
      <ErrorText>{errors.mandal?.message}</ErrorText>
      <FieldLabel>{t("completeProfile.village").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="village"
        render={({ field: { value, onChange } }) => (
          <AutocompleteField
            value={value ?? ""}
            onChange={onChange}
            suggestions={villageSuggestions}
            placeholder={t("completeProfile.villagePlaceholder")}
          />
        )}
      />
      <FieldLabel>{t("completeProfile.pincode").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="pincode"
        render={({ field: { value, onChange } }) => (
          <Field
            value={value}
            onChangeText={onChange}
            keyboardType="number-pad"
            maxLength={6}
            placeholder={t("completeProfile.pincodePlaceholder")}
          />
        )}
      />
      <ErrorText>{errors.pincode?.message}</ErrorText>
      <Text style={{ fontSize: 12, color: c.mutedLight, marginBottom: 14, fontFamily: font.regular }}>
        {t("completeProfile.mobile", { phone: profile.phone })}
      </Text>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title={t("completeProfile.saveAndContinue")} onPress={handleSubmit(save)} busy={busy} />

      <View style={{ alignItems: "center", marginTop: 22 }}>
        <LanguagePicker />
      </View>
      <Pressable onPress={logout} style={{ marginTop: 22, alignItems: "center" }}>
        <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.danger }}>{t("common.logOut")}</Text>
      </Pressable>
    </ScrollView>
  );
}
