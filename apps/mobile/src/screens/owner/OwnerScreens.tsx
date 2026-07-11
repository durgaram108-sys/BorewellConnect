import React, { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as ImagePicker from "expo-image-picker";
import { api, CompanyProfile, Lead, OwnerJob, setOwnerToken } from "../../api";
import { c, font, inr, statusColor, statusLabel } from "../../theme";
import { Card, Field, FieldLabel, LoadingScreen, PrimaryButton, ErrorText, ScreenTitle } from "../../components/ui";
import { MultiSelectField, SelectField } from "../../components/Picker";
import { RateCardField } from "../../components/RateCardField";
import { CalendarField } from "../../components/CalendarField";
import { showToast } from "../../components/Toast";
import { ALL_DISTRICTS, DISTRICTS_BY_STATE, INDIA_STATES } from "../../data/indiaLocations";
import { bandsNeededForDepth, MAX_DEPTH_FT } from "../../utils/pricing";
import type { OwnerStackParams } from "../../navigation";

const editProfileSchema = z.object({
  name: z.string().min(1, "Enter company name"),
  ownerName: z.string().min(1, "Enter owner name"),
  address: z.string().optional(),
  state: z.string().min(1, "Select your state"),
  city: z.string().min(1, "Select your district"),
  experienceYears: z.string().refine((v) => v.trim() !== "" && !isNaN(Number(v)) && Number(v) >= 0, "Enter valid years"),
  registrationNumber: z.string().optional(),
  serviceAreas: z.array(z.string()).min(1, "Select at least one service area"),
  machineType: z.string().min(1, "Enter machine type"),
  casingRate: z.string().refine((v) => v.trim() !== "" && !isNaN(Number(v)) && Number(v) > 0, "Enter a valid amount"),
  estimatedCompletion: z.string().min(1, "Enter an estimated completion time"),
});
type EditProfileForm = z.infer<typeof editProfileSchema>;

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

export function OwnerLogin({ navigation }: NativeStackScreenProps<OwnerStackParams, "OwnerLogin">) {
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
      setError(e instanceof Error ? e.message : "Failed to send OTP");
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
        PARTNER LOGIN
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
        Manage leads, quotes &amp; jobs as a verified borewell company
      </Text>

      <View style={{ alignSelf: "stretch", marginTop: 52 }}>
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
            placeholder="Registered company mobile"
            placeholderTextColor={c.mutedLight}
          />
        </View>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton title="Send OTP" onPress={send} busy={busy} style={{ marginTop: 22 }} />
        <Text style={{ fontSize: 11, color: c.mutedLight, textAlign: "center", marginTop: 16, fontFamily: font.regular }}>
          New company? <Text style={{ color: c.green, fontFamily: font.bold }}>Register here</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

export function OwnerOtp({ navigation, route }: NativeStackScreenProps<OwnerStackParams, "OwnerOtp">) {
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

export function OwnerDashboard({ navigation }: NativeStackScreenProps<OwnerStackParams, "OwnerDashboard">) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [earnings, setEarnings] = useState(0);

  useFocusEffect(
    useCallback(() => {
      api.profile().then(setProfile).catch(console.error);
      api.leads().then((l) => setLeadCount(l.length)).catch(console.error);
      api
        .jobs()
        .then((j) => setJobCount(j.filter((x) => x.status !== "COMPLETED" && x.status !== "CANCELLED").length))
        .catch(console.error);
      api.earnings().then((e) => setEarnings(e.thisMonth)).catch(console.error);
    }, [])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingVertical: 16 }}>
      <View
        style={{
          backgroundColor: c.navy,
          borderRadius: 16,
          marginHorizontal: 16,
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

      <View style={{ flexDirection: "row", gap: 12, marginHorizontal: 16, marginBottom: 18 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontFamily: font.extrabold, color: c.text }}>{leadCount}</Text>
          <Text style={{ fontSize: 11, color: c.muted, marginTop: 2, fontFamily: font.regular }}>New Leads</Text>
        </Card>
        <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate("ActiveJobs")}>
          <Card>
            <Text style={{ fontSize: 22, fontFamily: font.extrabold, color: c.text }}>{jobCount}</Text>
            <Text style={{ fontSize: 11, color: c.muted, marginTop: 2, fontFamily: font.regular }}>Active Jobs</Text>
          </Card>
        </Pressable>
      </View>

      <Pressable onPress={() => navigation.navigate("Earnings")}>
        <Card style={{ marginHorizontal: 16, marginBottom: 18 }}>
          <Text style={{ fontSize: 11, color: c.muted, fontFamily: font.regular }}>EARNINGS THIS MONTH</Text>
          <Text style={{ fontSize: 24, fontFamily: font.extrabold, color: c.green, marginTop: 4 }}>{inr(earnings)}</Text>
        </Card>
      </Pressable>

      <View style={{ marginHorizontal: 16 }}>
        <PrimaryButton title="View New Leads" onPress={() => navigation.navigate("NewLeads")} />
      </View>
    </ScrollView>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function NewLeads({ navigation }: NativeStackScreenProps<OwnerStackParams, "NewLeads">) {
  const [leads, setLeads] = useState<Lead[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.leads().then(setLeads).catch(console.error);
    }, [])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Matched Requests" onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 12, color: c.mutedLight, marginTop: -8, marginBottom: 16, fontFamily: font.regular }}>
        A quote is sent automatically using your saved rates — no action needed.
      </Text>
      {leads.length === 0 && (
        <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>
          No matched requests yet — make sure your service areas, pricing, and available dates are up to date.
        </Text>
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
          <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>Land Type: {l.landType}</Text>
          <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
            Expected Depth: {l.depthFt} ft
          </Text>
          <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
            Preferred Date: {fmtDate(l.preferredDate)}
          </Text>
        </Card>
      ))}
      <Text style={{ fontSize: 12, color: c.mutedLight, fontStyle: "italic", marginTop: 4, fontFamily: font.regular }}>
        Customer contact details are shared only after you're selected.
      </Text>
    </ScrollView>
  );
}

export function ActiveJobs({ navigation }: NativeStackScreenProps<OwnerStackParams, "ActiveJobs">) {
  const [jobs, setJobs] = useState<OwnerJob[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.jobs().then(setJobs).catch(console.error);
    }, [])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Active Jobs" onBack={() => navigation.goBack()} />
      {jobs.length === 0 && (
        <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>
          No jobs yet — you'll see bookings here once a customer selects your quote.
        </Text>
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
            <Text style={{ fontSize: 12, fontFamily: font.bold, color: statusColor(j.status) }}>{statusLabel(j.status)}</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function JobUpdate({ navigation, route }: NativeStackScreenProps<OwnerStackParams, "JobUpdate">) {
  const { jobId } = route.params;
  const [job, setJob] = useState<OwnerJob | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.jobs().then((all) => setJob(all.find((j) => j.id === jobId) ?? null)).catch(console.error);
  }, [jobId]);

  useFocusEffect(load);

  if (!job) return <LoadingScreen />;

  const next = job.milestones.find((m) => !m.completedAt);

  const advance = async () => {
    setBusy(true);
    try {
      await api.advanceMilestone(job.id);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title={`Job — ${job.code}`} onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 13, color: c.muted, marginBottom: 18, fontFamily: font.regular }}>
        {job.customerName ?? "Customer"} {job.customerPhone ? `· ${job.customerPhone}` : "· contact shared after payment"}
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
            <Text style={{ fontSize: 14, fontFamily: font.semibold, color: c.text }}>{m.label}</Text>
          </View>
        ))}
      </View>
      {next && <PrimaryButton title={`Mark "${next.label}"`} onPress={advance} busy={busy} />}
    </ScrollView>
  );
}

export function Earnings({ navigation }: NativeStackScreenProps<OwnerStackParams, "Earnings">) {
  const [data, setData] = useState<{ thisMonth: number; recentPayouts: { code: string; amount: number }[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.earnings().then(setData).catch(console.error);
    }, [])
  );

  // Bars reflect the most recent payouts (oldest → newest), scaled to the largest.
  const payouts = data?.recentPayouts ?? [];
  const barAmounts = payouts.slice(0, 6).reverse().map((p) => p.amount);
  const maxBar = Math.max(1, ...barAmounts);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Earnings" onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 28, fontFamily: font.extrabold, color: c.green }}>{inr(data?.thisMonth ?? 0)}</Text>
      <Text style={{ fontSize: 12, color: c.muted, marginBottom: 20, fontFamily: font.regular }}>This month</Text>
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
      <Text style={{ fontSize: 13, fontFamily: font.bold, marginBottom: 10, color: c.text }}>Recent Payouts</Text>
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
        <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>No payouts yet.</Text>
      )}
    </ScrollView>
  );
}

const PHOTO_SLOTS = [
  { slot: "vehicle-front", label: "Vehicle front" },
  { slot: "drill-unit", label: "Drill unit" },
  { slot: "registration", label: "Registration" },
] as const;

export function OwnerProfile({ navigation }: NativeStackScreenProps<OwnerStackParams, "OwnerProfile">) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.profile().then(setProfile).catch(console.error);
    }, [])
  );

  const pick = async (slot: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
    await api.uploadVehiclePhoto(slot, dataUri);
    const fresh = await api.profile();
    setProfile(fresh);
    showToast("Photo updated");
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
    const fresh = await api.profile();
    setProfile(fresh);
    showToast("Photo added");
  };

  const removeBorewellPhoto = async (id: string) => {
    await api.removeBorewellPhoto(id);
    const fresh = await api.profile();
    setProfile(fresh);
    showToast("Photo removed");
  };

  const logout = async () => {
    await setOwnerToken(null);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: "RoleSelect" }] });
  };

  if (!profile) return <LoadingScreen />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Company Profile" onBack={() => navigation.goBack()} />
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
          Owner: {profile.ownerName || "—"}
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>{profile.phone}</Text>
        {!!profile.address && (
          <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>{profile.address}</Text>
        )}
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
          {profile.city}, {profile.state}
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
          Experience: {profile.experienceYears}+ years
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
          Registration No: {profile.registrationNumber || "—"}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: font.bold, color: c.muted, marginTop: 12, marginBottom: 6 }}>
          SERVICE AREAS
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
        VEHICLE &amp; MACHINE PHOTOS
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
                    {"\n"}(tap to add)
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={{ fontSize: 12, fontFamily: font.bold, color: c.muted, marginBottom: 8 }}>
        BOREWELL WORK PHOTOS
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
              <Text style={{ color: "#fff", fontSize: 13, fontFamily: font.bold, lineHeight: 14 }}>×</Text>
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
            + Add{"\n"}Photo
          </Text>
        </Pressable>
      </View>

      <PrimaryButton title="Edit Profile" outline onPress={() => navigation.navigate("EditProfile")} />
      <Pressable onPress={logout} style={{ marginTop: 22, alignItems: "center" }}>
        <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.danger }}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const MAX_BAND_COUNT = bandsNeededForDepth(MAX_DEPTH_FT);

export function EditProfile({ navigation }: NativeStackScreenProps<OwnerStackParams, "EditProfile">) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rateCardInputs, setRateCardInputs] = useState<(number | undefined)[]>(Array(MAX_BAND_COUNT).fill(undefined));
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.profile().then((p) => {
        setProfile(p);
        setRateCardInputs(padRateCard(p.rateCard, MAX_BAND_COUNT));
        setAvailableDates(p.availableDates.map((d) => new Date(d)));
      }).catch(console.error);
    }, [])
  );

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
          casingRate: String(profile.casingRate),
          estimatedCompletion: profile.estimatedCompletion,
        }
      : undefined,
  });
  const selectedState = watch("state");

  if (!profile) return <LoadingScreen />;

  const save = async (data: EditProfileForm) => {
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
        rateCard: trimRateCard(rateCardInputs),
        casingRate: Number(data.casingRate),
        estimatedCompletion: data.estimatedCompletion,
        availableDates,
      });
      showToast("Profile saved");
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Edit Profile" onBack={() => navigation.goBack()} />
      <FieldLabel>COMPANY NAME</FieldLabel>
      <Controller control={control} name="name" render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} />} />
      <ErrorText>{errors.name?.message}</ErrorText>
      <FieldLabel>OWNER NAME</FieldLabel>
      <Controller
        control={control}
        name="ownerName"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} />}
      />
      <ErrorText>{errors.ownerName?.message}</ErrorText>
      <FieldLabel>ADDRESS (WHERE YOU OPERATE)</FieldLabel>
      <Controller
        control={control}
        name="address"
        render={({ field: { value, onChange } }) => (
          <Field
            value={value}
            onChangeText={onChange}
            placeholder="e.g. Plot 21, Industrial Area, Patancheru"
            multiline
            style={{ minHeight: 70, textAlignVertical: "top" }}
          />
        )}
      />
      <FieldLabel>STATE</FieldLabel>
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
            placeholder="Select State"
          />
        )}
      />
      <ErrorText>{errors.state?.message}</ErrorText>
      <FieldLabel>DISTRICT</FieldLabel>
      <Controller
        control={control}
        name="city"
        render={({ field: { value, onChange } }) => (
          <SelectField
            value={value}
            onChange={onChange}
            options={DISTRICTS_BY_STATE[selectedState] ?? []}
            placeholder="Select District"
            disabledMessage="Select a state first"
          />
        )}
      />
      <ErrorText>{errors.city?.message}</ErrorText>
      <FieldLabel>EXPERIENCE (YEARS)</FieldLabel>
      <Controller
        control={control}
        name="experienceYears"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} keyboardType="number-pad" />}
      />
      <ErrorText>{errors.experienceYears?.message}</ErrorText>
      <FieldLabel>REGISTRATION NUMBER</FieldLabel>
      <Controller
        control={control}
        name="registrationNumber"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} />}
      />
      <FieldLabel>SERVICE AREAS (DISTRICTS YOU OPERATE IN)</FieldLabel>
      <Controller
        control={control}
        name="serviceAreas"
        render={({ field: { value, onChange } }) => (
          <MultiSelectField values={value} onChange={onChange} options={ALL_DISTRICTS} placeholder="Select service areas" />
        )}
      />
      <ErrorText>{errors.serviceAreas?.message}</ErrorText>
      <FieldLabel>MACHINE TYPE</FieldLabel>
      <Controller
        control={control}
        name="machineType"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} />}
      />
      <ErrorText>{errors.machineType?.message}</ErrorText>
      <FieldLabel>ESTIMATED COMPLETION (SHOWN ON EVERY QUOTE)</FieldLabel>
      <Controller
        control={control}
        name="estimatedCompletion"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} placeholder="e.g. 3–4 days" />}
      />
      <ErrorText>{errors.estimatedCompletion?.message}</ErrorText>

      <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text, marginTop: 8, marginBottom: 4 }}>
        Pricing (₹ per ft by depth)
      </Text>
      <Text style={{ fontSize: 12, color: c.muted, marginBottom: 14, fontFamily: font.regular }}>
        Fill in rates from the top for however deep you drill — leave the rest blank. Quotes are generated
        automatically for matching, available leads using these rates — no manual submission needed.
      </Text>
      <RateCardField values={rateCardInputs} onChange={setRateCardInputs} bandCount={MAX_BAND_COUNT} />

      <FieldLabel>MACHINE &amp; CASING CHARGE (₹, FLAT)</FieldLabel>
      <Controller
        control={control}
        name="casingRate"
        render={({ field: { value, onChange } }) => (
          <Field value={value} onChangeText={onChange} keyboardType="number-pad" placeholder="e.g. 11500" />
        )}
      />
      <ErrorText>{errors.casingRate?.message}</ErrorText>

      <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text, marginTop: 8, marginBottom: 4 }}>
        Available Dates
      </Text>
      <Text style={{ fontSize: 12, color: c.muted, marginBottom: 14, fontFamily: font.regular }}>
        Mark the dates you can take on a new job. Requests are only auto-matched to you on dates you've
        marked available.
      </Text>
      <CalendarField mode="multi" value={availableDates} onChange={setAvailableDates} placeholder="Select available dates" />

      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Save Profile" onPress={handleSubmit(save)} busy={busy} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}
