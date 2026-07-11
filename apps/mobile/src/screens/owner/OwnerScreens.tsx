import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { api, setOwnerToken } from "../../api";
import { c, font, inr, localeFor, statusColor, statusLabel } from "../../theme";
import {
  Card,
  Field,
  FieldLabel,
  PrimaryButton,
  ErrorText,
  ScreenTitle,
  SkeletonDetail,
  SkeletonList,
} from "../../components/ui";
import { MultiSelectField, SelectField } from "../../components/Picker";
import { RateCardField } from "../../components/RateCardField";
import { CalendarField } from "../../components/CalendarField";
import { LanguagePicker } from "../../components/LanguagePicker";
import { showToast } from "../../components/Toast";
import { ALL_DISTRICTS, DISTRICTS_BY_STATE, INDIA_STATES } from "../../data/indiaLocations";
import { bandsNeededForDepth, MAX_DEPTH_FT } from "../../utils/pricing";
import { useFetch } from "../../hooks/useFetch";
import { useTranslation } from "../../i18n/LanguageContext";
import type { OwnerStackParams } from "../../navigation";

function makeEditProfileSchema(t: (key: string, vars?: Record<string, string | number>) => string) {
  return z.object({
    name: z.string().min(1, t("editProfile.companyNameRequired")),
    ownerName: z.string().min(1, t("editProfile.ownerNameRequired")),
    address: z.string().optional(),
    state: z.string().min(1, t("editProfile.stateRequired")),
    city: z.string().min(1, t("editProfile.districtRequired")),
    experienceYears: z.string().refine((v) => v.trim() !== "" && !isNaN(Number(v)) && Number(v) >= 0, t("editProfile.experienceYearsInvalid")),
    registrationNumber: z.string().optional(),
    serviceAreas: z.array(z.string()).min(1, t("editProfile.serviceAreasRequired")),
    machineType: z.string().min(1, t("editProfile.machineTypeRequired")),
    maxDepthFt: z
      .string()
      .refine((v) => v.trim() !== "" && !isNaN(Number(v)) && Number(v) > 0, t("editProfile.maxDepthRequired"))
      .refine((v) => Number(v) <= MAX_DEPTH_FT, t("editProfile.maxDepthMax", { max: MAX_DEPTH_FT })),
    casingRate: z.string().refine((v) => v.trim() !== "" && !isNaN(Number(v)) && Number(v) > 0, t("editProfile.casingRateInvalid")),
    estimatedCompletion: z.string().min(1, t("editProfile.estimatedCompletionRequired")),
  });
}
type EditProfileForm = z.infer<ReturnType<typeof makeEditProfileSchema>>;

/** Trims a sparse top-down rate list at the first gap — a driller who only fills bands 1-4 has a 4-entry rate card. */
function trimRateCard(inputs: (number | undefined)[]): number[] {
  const trimmed: number[] = [];
  for (const v of inputs) {
    if (v == null || isNaN(v) || v <= 0) break;
    trimmed.push(v);
  }
  return trimmed;
}

function padRateCard(rateCard: number[], length: number): (number | undefined)[] {
  const padded: (number | undefined)[] = Array(length).fill(undefined);
  rateCard.forEach((v, i) => {
    if (i < length) padded[i] = v;
  });
  return padded;
}

/** Milestone labels come from the server (packages/shared MILESTONES) — translate the known fixed set. */
function useMilestoneLabel() {
  const { t } = useTranslation();
  return (label: string) => t(`milestones.${label}`) || label;
}

export function OwnerLogin({ navigation }: NativeStackScreenProps<OwnerStackParams, "OwnerLogin">) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await api.ownerRequestOtp(phone);
      navigation.navigate("OwnerOtp", { phone });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ownerLogin.failedToSend"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 28, paddingTop: 60, alignItems: "center" }}>
      <Text style={{ fontSize: 26, fontFamily: font.extrabold, color: c.navy, letterSpacing: 0.5 }}>BOREWELL</Text>
      <Text style={{ fontSize: 26, fontFamily: font.extrabold, color: c.green, letterSpacing: 0.5, marginTop: -6 }}>
        CONNECT
      </Text>
      <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.orange, marginTop: 16, letterSpacing: 0.5 }}>
        {t("ownerLogin.partnerLogin")}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: c.muted,
          marginTop: 8,
          maxWidth: 240,
          textAlign: "center",
          fontFamily: font.regular,
        }}
      >
        {t("ownerLogin.tagline")}
      </Text>

      <View style={{ alignSelf: "stretch", marginTop: 52 }}>
        <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.muted, marginBottom: 6 }}>{t("ownerLogin.mobileNumber")}</Text>
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
            placeholder={t("ownerLogin.mobilePlaceholder")}
            placeholderTextColor={c.mutedLight}
          />
        </View>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton title={t("ownerLogin.sendOtp")} onPress={send} busy={busy} style={{ marginTop: 22 }} />
        <Text style={{ fontSize: 11, color: c.mutedLight, textAlign: "center", marginTop: 16, fontFamily: font.regular }}>
          {t("ownerLogin.registerPrompt")}
          <Text style={{ color: c.green, fontFamily: font.bold }}>{t("ownerLogin.registerHere")}</Text>
        </Text>
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <LanguagePicker />
        </View>
      </View>
    </ScrollView>
  );
}

export function OwnerOtp({ navigation, route }: NativeStackScreenProps<OwnerStackParams, "OwnerOtp">) {
  const { t } = useTranslation();
  const { phone } = route.params;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      const { token, isNew } = await api.ownerVerifyOtp(phone, code);
      await setOwnerToken(token);
      // First login: take the new company straight to Edit Profile to add details.
      navigation.reset({
        index: isNew ? 1 : 0,
        routes: isNew ? [{ name: "OwnerDashboard" }, { name: "EditProfile" }] : [{ name: "OwnerDashboard" }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ownerOtp.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingTop: 24 }}>
      <ScreenTitle title={t("ownerOtp.title")} onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>
        {t("ownerOtp.sentTo", { phone })}
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
        {t("ownerOtp.resend")}
      </Text>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title={t("ownerOtp.verify")} onPress={verify} busy={busy} style={{ marginTop: 26 }} />
    </ScrollView>
  );
}

export function OwnerDashboard({ navigation }: NativeStackScreenProps<OwnerStackParams, "OwnerDashboard">) {
  const { t } = useTranslation();
  const { data, loading, refreshing, refresh } = useFetch(
    () =>
      Promise.all([api.profile(), api.leads(), api.jobs(), api.earnings()]).then(([profile, leads, jobs, earnings]) => ({
        profile,
        leadCount: leads.length,
        jobCount: jobs.filter((x) => x.status !== "COMPLETED" && x.status !== "CANCELLED").length,
        earnings: earnings.thisMonth,
      })),
    []
  );
  const profile = data?.profile ?? null;
  const leadCount = data?.leadCount ?? 0;
  const jobCount = data?.jobCount ?? 0;
  const earnings = data?.earnings ?? 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View
        style={{
          backgroundColor: c.navy,
          borderRadius: 16,
          marginBottom: 18,
          padding: 20,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View>
          <Text style={{ color: "#fff", fontSize: 19, fontFamily: font.extrabold }}>{profile?.name ?? "…"}</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4, fontFamily: font.regular }}>
            {profile ? `${profile.experienceYears}+ Years Experience · ${profile.city}` : ""}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate("OwnerProfile")}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)" }}
        />
      </View>

      {loading ? (
        <SkeletonList rows={2} />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
            <Card style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontFamily: font.extrabold, color: c.text }}>{leadCount}</Text>
              <Text style={{ fontSize: 11, color: c.muted, marginTop: 2, fontFamily: font.regular }}>{t("ownerDashboard.newLeads")}</Text>
            </Card>
            <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate("ActiveJobs")}>
              <Card>
                <Text style={{ fontSize: 22, fontFamily: font.extrabold, color: c.text }}>{jobCount}</Text>
                <Text style={{ fontSize: 11, color: c.muted, marginTop: 2, fontFamily: font.regular }}>{t("ownerDashboard.activeJobs")}</Text>
              </Card>
            </Pressable>
          </View>

          <Pressable onPress={() => navigation.navigate("Earnings")}>
            <Card style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 11, color: c.muted, fontFamily: font.regular }}>{t("ownerDashboard.earningsThisMonth")}</Text>
              <Text style={{ fontSize: 24, fontFamily: font.extrabold, color: c.green, marginTop: 4 }}>{inr(earnings)}</Text>
            </Card>
          </Pressable>

          <PrimaryButton title={t("ownerDashboard.viewNewLeads")} onPress={() => navigation.navigate("NewLeads")} />
        </>
      )}
    </ScrollView>
  );
}

export function NewLeads({ navigation }: NativeStackScreenProps<OwnerStackParams, "NewLeads">) {
  const { t, language } = useTranslation();
  const { data, loading, refreshing, refresh } = useFetch(() => api.leads(), []);
  const leads = data ?? [];

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(localeFor(language), { day: "numeric", month: "short", year: "numeric" });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenTitle title={t("newLeads.title")} onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 12, color: c.mutedLight, marginTop: -8, marginBottom: 16, fontFamily: font.regular }}>
        {t("newLeads.subtitle")}
      </Text>
      {loading ? (
        <SkeletonList />
      ) : (
        <>
          {leads.length === 0 && (
            <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>{t("newLeads.empty")}</Text>
          )}
          {leads.map((l) => (
            <Card key={l.id} style={{ padding: 16, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={{ fontSize: 16, fontFamily: font.extrabold, color: c.text }}>{l.code}</Text>
                <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.green }}>{inr(l.totalPrice)}</Text>
              </View>
              <Text style={{ fontSize: 13, color: c.muted, marginTop: 8, fontFamily: font.regular }}>
                📍 {l.district}, {l.state}, {l.country}
              </Text>
              <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
                {t("newLeads.landType", { type: l.landType })}
              </Text>
              <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
                {t("newLeads.expectedDepth", { depth: l.depthFt })}
              </Text>
              <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
                {t("newLeads.preferredDate", { date: fmtDate(l.preferredDate) })}
              </Text>
            </Card>
          ))}
          <Text style={{ fontSize: 12, color: c.mutedLight, fontStyle: "italic", marginTop: 4, fontFamily: font.regular }}>
            {t("newLeads.contactNote")}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

export function ActiveJobs({ navigation }: NativeStackScreenProps<OwnerStackParams, "ActiveJobs">) {
  const { t } = useTranslation();
  const { data, loading, refreshing, refresh } = useFetch(() => api.jobs(), []);
  const jobs = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenTitle title={t("activeJobs.title")} onBack={() => navigation.goBack()} />
      {loading ? (
        <SkeletonList />
      ) : (
        <>
          {jobs.length === 0 && (
            <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>{t("activeJobs.empty")}</Text>
          )}
          {jobs.map((j) => (
            <Pressable key={j.id} onPress={() => navigation.navigate("JobUpdate", { jobId: j.id })}>
              <Card
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontFamily: font.bold, fontSize: 14, color: c.text }}>{j.code}</Text>
                <Text style={{ fontSize: 12, fontFamily: font.bold, color: statusColor(j.status) }}>
                  {statusLabel(j.status)}
                </Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

export function JobUpdate({ navigation, route }: NativeStackScreenProps<OwnerStackParams, "JobUpdate">) {
  const { t } = useTranslation();
  const translateMilestone = useMilestoneLabel();
  const { jobId } = route.params;
  const [busy, setBusy] = useState(false);
  const { data: job, loading, refreshing, refresh } = useFetch(
    () => api.jobs().then((all) => all.find((j) => j.id === jobId) ?? null),
    [jobId]
  );

  if (loading || !job) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
        <ScreenTitle title={t("jobUpdate.loadingTitle")} onBack={() => navigation.goBack()} />
        <SkeletonDetail />
      </ScrollView>
    );
  }

  const next = job.milestones.find((m) => !m.completedAt);

  const advance = async () => {
    setBusy(true);
    try {
      await api.advanceMilestone(job.id);
      refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenTitle title={t("jobUpdate.title", { code: job.code })} onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 13, color: c.muted, marginBottom: 18, fontFamily: font.regular }}>
        {job.customerName ?? t("jobUpdate.customer")} {job.customerPhone ? `· ${job.customerPhone}` : t("jobUpdate.contactSharedAfterPayment")}
      </Text>
      <View style={{ gap: 14, marginBottom: 22 }}>
        {job.milestones.map((m) => (
          <View key={m.label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: m.completedAt ? c.green : c.disabledDot,
              }}
            />
            <Text style={{ fontSize: 14, fontFamily: font.semibold, color: c.text }}>{translateMilestone(m.label)}</Text>
          </View>
        ))}
      </View>
      {next && <PrimaryButton title={t("jobUpdate.markMilestone", { label: translateMilestone(next.label) })} onPress={advance} busy={busy} />}
    </ScrollView>
  );
}

export function Earnings({ navigation }: NativeStackScreenProps<OwnerStackParams, "Earnings">) {
  const { t } = useTranslation();
  const { data, loading, refreshing, refresh } = useFetch(() => api.earnings(), []);

  // Bars reflect the most recent payouts (oldest → newest), scaled to the largest.
  const payouts = data?.recentPayouts ?? [];
  const barAmounts = payouts.slice(0, 6).reverse().map((p) => p.amount);
  const maxBar = Math.max(1, ...barAmounts);

  if (loading) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
        <ScreenTitle title={t("earnings.title")} onBack={() => navigation.goBack()} />
        <SkeletonDetail />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenTitle title={t("earnings.title")} onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 28, fontFamily: font.extrabold, color: c.green }}>{inr(data?.thisMonth ?? 0)}</Text>
      <Text style={{ fontSize: 12, color: c.muted, marginBottom: 20, fontFamily: font.regular }}>{t("earnings.thisMonth")}</Text>
      {barAmounts.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, height: 100, marginBottom: 24 }}>
          {barAmounts.map((amount, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: i === barAmounts.length - 1 ? c.green : c.navy,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
                height: `${Math.max(8, (amount / maxBar) * 100)}%`,
              }}
            />
          ))}
        </View>
      )}
      <Text style={{ fontSize: 13, fontFamily: font.bold, marginBottom: 10, color: c.text }}>{t("earnings.recentPayouts")}</Text>
      {(data?.recentPayouts ?? []).map((p) => (
        <View
          key={p.code}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: c.trackBg,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: font.regular, color: c.text }}>{p.code}</Text>
          <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.text }}>{inr(p.amount)}</Text>
        </View>
      ))}
      {data && data.recentPayouts.length === 0 && (
        <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>{t("earnings.empty")}</Text>
      )}
    </ScrollView>
  );
}

export function OwnerProfile({ navigation }: NativeStackScreenProps<OwnerStackParams, "OwnerProfile">) {
  const { t } = useTranslation();
  const PHOTO_SLOTS = [
    { slot: "vehicle-front", label: t("ownerProfile.vehicleFront") },
    { slot: "drill-unit", label: t("ownerProfile.drillUnit") },
    { slot: "registration", label: t("ownerProfile.registration") },
  ] as const;
  const { data: profile, loading, refreshing, refresh } = useFetch(() => api.profile(), []);

  const pick = async (slot: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
    await api.uploadVehiclePhoto(slot, dataUri);
    refresh();
    showToast(t("ownerProfile.photoUpdated"));
  };

  const pickBorewellPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
    await api.addBorewellPhoto(dataUri);
    refresh();
    showToast(t("ownerProfile.photoAdded"));
  };

  const removeBorewellPhoto = async (id: string) => {
    await api.removeBorewellPhoto(id);
    refresh();
    showToast(t("ownerProfile.photoRemoved"));
  };

  const logout = async () => {
    await setOwnerToken(null);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: "RoleSelect" }] });
  };

  if (loading || !profile) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
        <ScreenTitle title={t("ownerProfile.title")} onBack={() => navigation.goBack()} />
        <SkeletonDetail />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenTitle title={t("ownerProfile.title")} onBack={() => navigation.goBack()} />
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: font.extrabold, fontSize: 16, color: c.text }}>{profile.name}</Text>
          <View
            style={{
              backgroundColor: profile.status === "VERIFIED" ? c.successBg : "#FCEBD9",
              paddingVertical: 3,
              paddingHorizontal: 8,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontFamily: font.extrabold,
                color: profile.status === "VERIFIED" ? c.green : c.orange,
              }}
            >
              {profile.status}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 10, fontFamily: font.regular }}>
          {t("ownerProfile.owner", { name: profile.ownerName || "—" })}
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>{profile.phone}</Text>
        {!!profile.address && (
          <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>{profile.address}</Text>
        )}
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
          {profile.city}, {profile.state}
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
          {t("ownerProfile.experience", { years: profile.experienceYears })}
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
          {t("ownerProfile.registrationNo", { no: profile.registrationNumber || "—" })}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: font.bold, color: c.muted, marginTop: 12, marginBottom: 6 }}>
          {t("ownerProfile.serviceAreas")}
        </Text>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {profile.serviceAreas.map((a) => (
            <View key={a} style={{ backgroundColor: c.chipBg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 }}>
              <Text style={{ fontSize: 11, fontFamily: font.semibold, color: c.text }}>{a}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text style={{ fontSize: 12, fontFamily: font.bold, color: c.muted, marginBottom: 8 }}>
        {t("ownerProfile.vehicleMachinePhotos")}
      </Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        {PHOTO_SLOTS.map(({ slot, label }) => {
          const photo = profile.vehiclePhotos.find((p) => p.slot === slot);
          return (
            <Pressable key={slot} onPress={() => pick(slot)} style={{ flex: 1 }}>
              {photo ? (
                <Image source={{ uri: photo.url }} style={{ height: 90, borderRadius: 10 }} />
              ) : (
                <View
                  style={{
                    height: 90,
                    borderRadius: 10,
                    backgroundColor: "#EFEDE8",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: c.border,
                    borderStyle: "dashed",
                  }}
                >
                  <Text style={{ fontSize: 10, color: c.muted, fontFamily: font.regular, textAlign: "center" }}>
                    {label}
                    {"\n"}{t("common.tapToAdd")}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={{ fontSize: 12, fontFamily: font.bold, color: c.muted, marginBottom: 8 }}>
        {t("ownerProfile.borewellWorkPhotos")}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        {profile.borewellPhotos.map((photo) => (
          <View key={photo.id} style={{ width: 90, height: 90 }}>
            <Image source={{ uri: photo.url }} style={{ width: 90, height: 90, borderRadius: 10 }} />
            <Pressable
              onPress={() => removeBorewellPhoto(photo.id)}
              hitSlop={8}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: c.navy,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="x" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={pickBorewellPhoto}
          style={{
            width: 90,
            height: 90,
            borderRadius: 10,
            backgroundColor: "#EFEDE8",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: c.border,
            borderStyle: "dashed",
          }}
        >
          <Text style={{ fontSize: 11, color: c.muted, fontFamily: font.regular, textAlign: "center" }}>
            {t("ownerProfile.addPhoto")}
          </Text>
        </Pressable>
      </View>

      <PrimaryButton title={t("ownerProfile.editProfile")} outline onPress={() => navigation.navigate("EditProfile")} />
      <Pressable onPress={logout} style={{ marginTop: 22, alignItems: "center" }}>
        <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.danger }}>{t("common.logOut")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const MAX_BAND_COUNT = bandsNeededForDepth(MAX_DEPTH_FT);

export function EditProfile({ navigation }: NativeStackScreenProps<OwnerStackParams, "EditProfile">) {
  const { t } = useTranslation();
  const { data: profile, loading } = useFetch(() => api.profile(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rateCardInputs, setRateCardInputs] = useState<(number | undefined)[]>(Array(MAX_BAND_COUNT).fill(undefined));
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    if (profile && initializedFor.current !== profile.id) {
      setRateCardInputs(padRateCard(profile.rateCard, MAX_BAND_COUNT));
      setAvailableDates(profile.availableDates.map((d) => new Date(d)));
      initializedFor.current = profile.id;
    }
  }, [profile]);

  const editProfileSchema = useMemo(() => makeEditProfileSchema(t), [t]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    values: profile
      ? {
          name: profile.name,
          ownerName: profile.ownerName,
          address: profile.address,
          state: profile.state,
          city: profile.city,
          experienceYears: String(profile.experienceYears),
          registrationNumber: profile.registrationNumber,
          serviceAreas: profile.serviceAreas,
          machineType: profile.machineType,
          maxDepthFt: profile.maxDepthFt ? String(profile.maxDepthFt) : "",
          casingRate: String(profile.casingRate),
          estimatedCompletion: profile.estimatedCompletion,
        }
      : undefined,
  });
  const selectedState = watch("state");
  const maxDepthFt = watch("maxDepthFt");
  const bandCount = Number(maxDepthFt) > 0 ? bandsNeededForDepth(Number(maxDepthFt)) : 0;

  if (loading || !profile) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
        <ScreenTitle title={t("editProfile.title")} onBack={() => navigation.goBack()} />
        <SkeletonDetail />
      </ScrollView>
    );
  }

  const save = async (data: EditProfileForm) => {
    const trimmedRateCard = trimRateCard(rateCardInputs.slice(0, bandCount));
    if (trimmedRateCard.length !== bandCount) {
      setError(t("editProfile.bandRateError", { count: bandCount }));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.updateProfile({
        name: data.name,
        ownerName: data.ownerName,
        address: data.address,
        state: data.state,
        city: data.city,
        experienceYears: Number(data.experienceYears),
        registrationNumber: data.registrationNumber,
        serviceAreas: data.serviceAreas,
        machineType: data.machineType,
        maxDepthFt: Number(data.maxDepthFt),
        rateCard: trimmedRateCard,
        casingRate: Number(data.casingRate),
        estimatedCompletion: data.estimatedCompletion,
        availableDates,
      });
      showToast(t("editProfile.saved"));
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editProfile.failedToSave"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title={t("editProfile.title")} onBack={() => navigation.goBack()} />
      <FieldLabel>{t("editProfile.companyName").toUpperCase()}</FieldLabel>
      <Controller control={control} name="name" render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} />} />
      <ErrorText>{errors.name?.message}</ErrorText>
      <FieldLabel>{t("editProfile.ownerName").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="ownerName"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} />}
      />
      <ErrorText>{errors.ownerName?.message}</ErrorText>
      <FieldLabel>{t("editProfile.address").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="address"
        render={({ field: { value, onChange } }) => (
          <Field
            value={value}
            onChangeText={onChange}
            placeholder={t("editProfile.addressPlaceholder")}
            multiline
            style={{ minHeight: 70, textAlignVertical: "top" }}
          />
        )}
      />
      <FieldLabel>{t("editProfile.state").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="state"
        render={({ field: { value, onChange } }) => (
          <SelectField
            value={value}
            onChange={(v) => {
              onChange(v);
              setValue("city", "");
            }}
            options={INDIA_STATES}
            placeholder={t("editProfile.selectState")}
          />
        )}
      />
      <ErrorText>{errors.state?.message}</ErrorText>
      <FieldLabel>{t("editProfile.district").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="city"
        render={({ field: { value, onChange } }) => (
          <SelectField
            value={value}
            onChange={onChange}
            options={DISTRICTS_BY_STATE[selectedState] ?? []}
            placeholder={t("editProfile.selectDistrict")}
            disabledMessage={t("editProfile.selectStateFirst")}
          />
        )}
      />
      <ErrorText>{errors.city?.message}</ErrorText>
      <FieldLabel>{t("editProfile.experienceYears").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="experienceYears"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} keyboardType="number-pad" />}
      />
      <ErrorText>{errors.experienceYears?.message}</ErrorText>
      <FieldLabel>{t("editProfile.registrationNumber").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="registrationNumber"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} />}
      />
      <FieldLabel>{t("editProfile.serviceAreas").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="serviceAreas"
        render={({ field: { value, onChange } }) => (
          <MultiSelectField values={value} onChange={onChange} options={ALL_DISTRICTS} placeholder={t("editProfile.serviceAreasPlaceholder")} />
        )}
      />
      <ErrorText>{errors.serviceAreas?.message}</ErrorText>
      <FieldLabel>{t("editProfile.machineType").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="machineType"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} />}
      />
      <ErrorText>{errors.machineType?.message}</ErrorText>
      <FieldLabel>{t("editProfile.estimatedCompletion").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="estimatedCompletion"
        render={({ field: { value, onChange } }) => (
          <Field value={value} onChangeText={onChange} placeholder={t("editProfile.estimatedCompletionPlaceholder")} />
        )}
      />
      <ErrorText>{errors.estimatedCompletion?.message}</ErrorText>
      <FieldLabel>{t("editProfile.maxDepth").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="maxDepthFt"
        render={({ field: { value, onChange } }) => (
          <Field value={value} onChangeText={onChange} keyboardType="number-pad" placeholder={t("editProfile.maxDepthPlaceholder")} />
        )}
      />
      <ErrorText>{errors.maxDepthFt?.message}</ErrorText>
      <Text style={{ fontSize: 12, color: c.mutedLight, marginTop: -6, marginBottom: 14, fontFamily: font.regular }}>
        {t("editProfile.maxDepthHint")}
      </Text>

      {bandCount > 0 && (
        <>
          <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text, marginTop: 8, marginBottom: 4 }}>
            {t("editProfile.pricingTitle")}
          </Text>
          <Text style={{ fontSize: 12, color: c.muted, marginBottom: 14, fontFamily: font.regular }}>
            {t("editProfile.pricingHint")}
          </Text>
          <RateCardField values={rateCardInputs} onChange={setRateCardInputs} bandCount={bandCount} />
        </>
      )}

      <FieldLabel>{t("editProfile.casingRate").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="casingRate"
        render={({ field: { value, onChange } }) => (
          <Field value={value} onChangeText={onChange} keyboardType="number-pad" placeholder={t("editProfile.casingRatePlaceholder")} />
        )}
      />
      <ErrorText>{errors.casingRate?.message}</ErrorText>

      <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text, marginTop: 8, marginBottom: 4 }}>
        {t("editProfile.availableDatesTitle")}
      </Text>
      <Text style={{ fontSize: 12, color: c.muted, marginBottom: 14, fontFamily: font.regular }}>
        {t("editProfile.availableDatesHint")}
      </Text>
      <CalendarField mode="multi" value={availableDates} onChange={setAvailableDates} placeholder={t("editProfile.selectAvailableDates")} />

      <ErrorText>{error}</ErrorText>
      <PrimaryButton title={t("editProfile.saveProfile")} onPress={handleSubmit(save)} busy={busy} style={{ marginTop: 8 }} />

      <View style={{ alignItems: "center", marginTop: 22 }}>
        <LanguagePicker />
      </View>
    </ScrollView>
  );
}
