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
import { showToast } from "../../components/Toast";
import type { OwnerStackParams } from "../../navigation";

const editProfileSchema = z.object({
  name: z.string().min(1, "Enter company name"),
  ownerName: z.string().min(1, "Enter owner name"),
  address: z.string().optional(),
  city: z.string().min(1, "Enter city"),
  experienceYears: z.string().refine((v) => v.trim() !== "" && !isNaN(Number(v)) && Number(v) >= 0, "Enter valid years"),
  registrationNumber: z.string().optional(),
  serviceAreas: z.string(),
  machineType: z.string().min(1, "Enter machine type"),
});
type EditProfileForm = z.infer<typeof editProfileSchema>;

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
      <ScreenTitle title="New Leads" onBack={() => navigation.goBack()} />
      {leads.length === 0 && (
        <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>No open leads in your service areas.</Text>
      )}
      {leads.map((l) => (
        <Card key={l.id} style={{ padding: 16, marginBottom: 14 }}>
          <Text style={{ fontSize: 16, fontFamily: font.extrabold, color: c.text }}>{l.code}</Text>
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
          <PrimaryButton
            title="Submit Quote"
            onPress={() => navigation.navigate("SubmitQuote", { requestId: l.id, code: l.code })}
            style={{ marginTop: 16 }}
          />
        </Card>
      ))}
      <Text style={{ fontSize: 12, color: c.mutedLight, fontStyle: "italic", marginTop: 4, fontFamily: font.regular }}>
        Customer contact details are shared only after you're selected.
      </Text>
    </ScrollView>
  );
}

export function SubmitQuote({ navigation, route }: NativeStackScreenProps<OwnerStackParams, "SubmitQuote">) {
  const { requestId } = route.params;
  const [price, setPrice] = useState("");
  const [machine, setMachine] = useState("DTH");
  const [eta, setEta] = useState("3–4 days");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const pricePerFt = Number(price);
    if (!pricePerFt || pricePerFt <= 0) return setError("Enter your price per foot");
    setBusy(true);
    setError("");
    try {
      await api.submitQuote(requestId, { pricePerFt, machineType: machine, estimatedCompletion: eta });
      navigation.reset({
        index: 1,
        routes: [{ name: "OwnerDashboard" }, { name: "ActiveJobs", params: { justSubmitted: true } }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit quote");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Submit Quote" onBack={() => navigation.goBack()} />
      <FieldLabel>PRICE PER FT (₹)</FieldLabel>
      <Field value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="e.g. 185" style={{ fontSize: 16 }} />
      <FieldLabel>MACHINE TYPE</FieldLabel>
      <Field value={machine} onChangeText={setMachine} />
      <FieldLabel>ESTIMATED COMPLETION</FieldLabel>
      <Field value={eta} onChangeText={setEta} style={{ marginBottom: 22 }} />
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Submit Quotation" onPress={submit} busy={busy} />
    </ScrollView>
  );
}

export function ActiveJobs({ navigation, route }: NativeStackScreenProps<OwnerStackParams, "ActiveJobs">) {
  const [jobs, setJobs] = useState<OwnerJob[]>([]);
  const justSubmitted = route.params?.justSubmitted;

  useFocusEffect(
    useCallback(() => {
      api.jobs().then(setJobs).catch(console.error);
    }, [])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingVertical: 16 }}>
      <Text style={{ fontSize: 20, fontFamily: font.extrabold, paddingHorizontal: 16, paddingBottom: 6, color: c.text }}>
        Active Jobs
      </Text>
      {justSubmitted && (
        <View
          style={{
            backgroundColor: c.successBg,
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginHorizontal: 16,
            marginVertical: 8,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: c.successText, fontSize: 12, fontFamily: font.bold }}>
            Quotation submitted successfully
          </Text>
        </View>
      )}
      {jobs.length === 0 && (
        <Text style={{ paddingHorizontal: 16, fontSize: 13, color: c.muted, fontFamily: font.regular }}>
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
              marginHorizontal: 16,
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

export function Earnings(_props: NativeStackScreenProps<OwnerStackParams, "Earnings">) {
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
      <Text style={{ fontSize: 20, fontFamily: font.extrabold, paddingBottom: 14, color: c.text }}>Earnings</Text>
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

export function EditProfile({ navigation }: NativeStackScreenProps<OwnerStackParams, "EditProfile">) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      api.profile().then(setProfile).catch(console.error);
    }, [])
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    values: profile
      ? {
          name: profile.name,
          ownerName: profile.ownerName,
          address: profile.address,
          city: profile.city,
          experienceYears: String(profile.experienceYears),
          registrationNumber: profile.registrationNumber,
          serviceAreas: profile.serviceAreas.join(", "),
          machineType: profile.machineType,
        }
      : undefined,
  });

  if (!profile) return <LoadingScreen />;

  const save = async (data: EditProfileForm) => {
    setBusy(true);
    setError("");
    try {
      await api.updateProfile({
        name: data.name,
        ownerName: data.ownerName,
        address: data.address,
        city: data.city,
        experienceYears: Number(data.experienceYears),
        registrationNumber: data.registrationNumber,
        serviceAreas: data.serviceAreas.split(",").map((s) => s.trim()).filter(Boolean),
        machineType: data.machineType,
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
      <FieldLabel>CITY</FieldLabel>
      <Controller control={control} name="city" render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} />} />
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
      <FieldLabel>SERVICE AREAS (COMMA-SEPARATED)</FieldLabel>
      <Controller
        control={control}
        name="serviceAreas"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} />}
      />
      <FieldLabel>MACHINE TYPE</FieldLabel>
      <Controller
        control={control}
        name="machineType"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} style={{ marginBottom: 22 }} />}
      />
      <ErrorText>{errors.machineType?.message}</ErrorText>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Save Profile" onPress={handleSubmit(save)} busy={busy} />
    </ScrollView>
  );
}
