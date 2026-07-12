import React, { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import { api } from "../../api";
import { c, font, inr, localeFor, statusColor, statusLabel } from "../../theme";
import {
  Card,
  PrimaryButton,
  ErrorText,
  ScreenTitle,
  SkeletonDetail,
  SkeletonList,
  StripedPlaceholder,
} from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useTranslation } from "../../i18n/LanguageContext";
import type { CustomerStackParams } from "../../navigation";

function useBooking(bookingId: string) {
  return useFetch(() => api.booking(bookingId), [bookingId]);
}

/** Milestone labels come from the server (packages/shared MILESTONES) — translate the known fixed set. */
function useMilestoneLabel() {
  const { t } = useTranslation();
  return (label: string) => t(`milestones.${label}`) || label;
}

export function Tracking({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "Tracking">) {
  const { t, language } = useTranslation();
  const translateMilestone = useMilestoneLabel();
  const { data: booking, loading, refreshing, refresh } = useBooking(route.params.bookingId);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString(localeFor(language), { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  if (loading || !booking) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
        <ScreenTitle title={t("tracking.title")} onBack={() => navigation.goBack()} />
        <SkeletonDetail />
      </ScrollView>
    );
  }

  const rows: { label: string; time?: string; state: "done" | "current" | "todo" }[] = [
    { label: t("tracking.bookingConfirmed"), time: fmtTime(booking.milestones[0]?.completedAt ?? new Date().toISOString()), state: "done" },
    { label: t("tracking.paymentCompleted"), state: booking.status === "CONFIRMED" ? "todo" : "done" },
    ...booking.milestones.slice(1).map((m, i, arr): { label: string; time?: string; state: "done" | "current" | "todo" } => ({
      label: translateMilestone(m.label),
      time: m.completedAt ? fmtTime(m.completedAt) : undefined,
      state: m.completedAt ? (arr.slice(i + 1).some((n) => n.completedAt) ? "done" : "current") : "todo",
    })),
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenTitle title={t("tracking.title")} onBack={() => navigation.goBack()} />
      <View style={{ gap: 18 }}>
        {rows.map((r) => (
          <View key={r.label} style={{ flexDirection: "row", gap: 12 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                marginTop: 4,
                backgroundColor: r.state === "done" ? c.green : r.state === "current" ? c.orange : c.disabledDot,
              }}
            />
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: font.bold,
                  color: r.state === "todo" ? c.mutedLight : c.text,
                }}
              >
                {r.label}
              </Text>
              {r.time && <Text style={{ fontSize: 11, color: c.mutedLight, fontFamily: font.regular }}>{r.time}</Text>}
            </View>
          </View>
        ))}
      </View>
      <PrimaryButton title={t("tracking.contactCompany")} outline style={{ marginTop: 30 }} />
      <PrimaryButton
        title={t("tracking.viewJobDetails")}
        onPress={() => navigation.navigate("JobDetails", { bookingId: booking.id })}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}

export function JobDetails({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "JobDetails">) {
  const { t } = useTranslation();
  const { data: booking, loading, refreshing, refresh } = useBooking(route.params.bookingId);

  if (loading || !booking) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
        <ScreenTitle title={t("jobDetails.title")} onBack={() => navigation.goBack()} />
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
      <ScreenTitle title={t("jobDetails.title")} onBack={() => navigation.goBack()} />
      <Card style={{ marginBottom: 14, padding: 16 }}>
        <Text style={{ fontFamily: font.extrabold, fontSize: 16, color: c.text }}>{booking.company.name}</Text>
        <Text style={{ fontSize: 12, color: c.muted, marginTop: 4, fontFamily: font.regular }}>
          {t("jobDetails.yearsExperience", { years: booking.company.experienceYears, city: booking.company.city, state: booking.company.state })}
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 8, fontFamily: font.regular }}>
          📞 {booking.company.phone ?? t("jobDetails.sharedAfterPayment")}
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 4, fontFamily: font.regular }}>
          {t("jobDetails.machineType", { type: booking.machineType })}
        </Text>
      </Card>
      <StripedPlaceholder label={t("jobDetails.sitePhoto")} style={{ height: 140, marginBottom: 22 }} />
      <PrimaryButton
        title={t("jobDetails.viewWorkUpdates")}
        onPress={() => navigation.navigate("WorkUpdates", { bookingId: booking.id })}
      />
    </ScrollView>
  );
}

export function WorkUpdates({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "WorkUpdates">) {
  const { t, language } = useTranslation();
  const translateMilestone = useMilestoneLabel();
  const { data: booking, loading, refreshing, refresh } = useBooking(route.params.bookingId);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString(localeFor(language), { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  if (loading || !booking) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
        <ScreenTitle title={t("workUpdates.title")} onBack={() => navigation.goBack()} />
        <SkeletonList rows={2} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenTitle title={t("workUpdates.title")} onBack={() => navigation.goBack()} />
      {booking.workUpdates.length === 0 && (
        <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>{t("workUpdates.empty")}</Text>
      )}
      {booking.workUpdates.map((w) => (
        <View key={w.id} style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <StripedPlaceholder label="" style={{ width: 64, height: 64, borderRadius: 10 }} />
          <View>
            <Text style={{ fontSize: 14, fontFamily: font.bold, color: c.text }}>{translateMilestone(w.label)}</Text>
            <Text style={{ fontSize: 12, color: c.mutedLight, marginTop: 2, fontFamily: font.regular }}>
              {fmtTime(w.createdAt)}
            </Text>
          </View>
        </View>
      ))}
      {booking.invoice && (
        <PrimaryButton
          title={t("workUpdates.viewInvoice")}
          onPress={() => navigation.navigate("Invoice", { bookingId: booking.id })}
          style={{ marginTop: 10 }}
        />
      )}
    </ScrollView>
  );
}

export function InvoiceScreen({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "Invoice">) {
  const { t, language } = useTranslation();
  const { data: booking, loading, refreshing, refresh } = useBooking(route.params.bookingId);

  if (loading || !booking?.invoice) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
        <ScreenTitle title={t("invoice.title")} onBack={() => navigation.goBack()} />
        <SkeletonDetail />
      </ScrollView>
    );
  }
  const inv = booking.invoice;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenTitle title={t("invoice.title")} onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 12, color: c.mutedLight, fontFamily: font.regular }}>
        {inv.code} · {new Date(inv.createdAt).toLocaleDateString(localeFor(language), { day: "numeric", month: "short", year: "numeric" })}
      </Text>
      <Card style={{ marginTop: 12, padding: 16 }}>
        {inv.lineItems.map((li, i) => (
          <View
            key={li.label}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 6,
              borderBottomWidth: i === inv.lineItems.length - 1 ? 1 : 0,
              borderBottomColor: c.trackBg,
            }}
          >
            <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>{li.label}</Text>
            <Text style={{ fontSize: 13, fontFamily: font.bold, color: li.amount < 0 ? c.green : c.text }}>
              {li.amount < 0 ? `− ${inr(-li.amount)}` : inr(li.amount)}
            </Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 12 }}>
          <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text }}>{t("invoice.totalPayable")}</Text>
          <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text }}>{inr(inv.total)}</Text>
        </View>
      </Card>
      <PrimaryButton title={t("invoice.download")} outline style={{ marginTop: 20 }} />
      <PrimaryButton
        title={t("invoice.rateAndReview")}
        onPress={() => navigation.navigate("Review", { bookingId: booking.id, companyName: booking.company.name })}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}

export function Review({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "Review">) {
  const { t } = useTranslation();
  const { bookingId, companyName } = route.params;
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api.submitReview(bookingId, rating, text);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("review.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingTop: 24, alignItems: "center" }}>
      <View style={{ alignSelf: "stretch" }}>
        <ScreenTitle title={t("review.title")} onBack={() => navigation.goBack()} />
      </View>
      <Text style={{ fontSize: 13, color: c.muted, marginTop: -8, fontFamily: font.regular }}>
        {t("review.howWasExperience", { company: companyName })}
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 22 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)}>
            <Svg width={32} height={32} viewBox="0 0 24 24">
              <Path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z"
                fill={n <= rating ? c.orange : "#D9D9D9"}
              />
            </Svg>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t("review.writeReview")}
        placeholderTextColor={c.mutedLight}
        multiline
        style={{
          alignSelf: "stretch",
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          padding: 12,
          fontSize: 14,
          fontFamily: font.regular,
          marginTop: 22,
          height: 80,
          backgroundColor: "#fff",
          textAlignVertical: "top",
          color: c.text,
        }}
      />
      <ErrorText>{error}</ErrorText>
      {submitted ? (
        <>
          <View
            style={{
              backgroundColor: c.successBg,
              padding: 14,
              borderRadius: 12,
              marginTop: 18,
              alignSelf: "stretch",
              alignItems: "center",
            }}
          >
            <Text style={{ color: c.successText, fontFamily: font.bold, fontSize: 14 }}>{t("review.thanks")}</Text>
          </View>
          <PrimaryButton
            title={t("review.viewMyBookings")}
            onPress={() => navigation.navigate("MyBookings")}
            style={{ marginTop: 14, alignSelf: "stretch" }}
          />
        </>
      ) : (
        <PrimaryButton title={t("review.submit")} onPress={submit} busy={busy} style={{ marginTop: 18, alignSelf: "stretch" }} />
      )}
    </ScrollView>
  );
}

export function MyBookings({ navigation }: NativeStackScreenProps<CustomerStackParams, "MyBookings">) {
  const { t } = useTranslation();
  const { data, loading, refreshing, refresh } = useFetch(() => api.myBookings(), []);
  const bookings = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenTitle title={t("myBookings.title")} onBack={() => navigation.goBack()} />
      {loading ? (
        <SkeletonList />
      ) : (
        <>
          {bookings.length === 0 && (
            <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>{t("myBookings.empty")}</Text>
          )}
          {bookings.map((b) => (
            <Pressable key={b.id} onPress={() => navigation.navigate("Tracking", { bookingId: b.id })}>
              <Card
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <View>
                  <Text style={{ fontFamily: font.bold, fontSize: 14, color: c.text }}>{b.code}</Text>
                  <Text style={{ fontSize: 12, color: c.muted, marginTop: 2, fontFamily: font.regular }}>
                    {b.companyName}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontFamily: font.bold, color: statusColor(b.status) }}>
                  {statusLabel(b.status)}
                </Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}
