import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import { api, BookingDetail } from "../../api";
import { c, font, inr, statusColor, statusLabel } from "../../theme";
import { Card, PrimaryButton, ErrorText, ScreenTitle, StripedPlaceholder } from "../../components/ui";
import type { CustomerStackParams } from "../../navigation";

function useBooking(bookingId: string) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  useFocusEffect(
    useCallback(() => {
      api.booking(bookingId).then(setBooking).catch(console.error);
    }, [bookingId])
  );
  return booking;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export function Tracking({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "Tracking">) {
  const booking = useBooking(route.params.bookingId);
  if (!booking) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const rows: { label: string; time?: string; state: "done" | "current" | "todo" }[] = [
    { label: "Booking Confirmed", time: fmtTime(booking.milestones[0]?.completedAt ?? new Date().toISOString()), state: "done" },
    { label: "Payment Completed", state: booking.status === "CONFIRMED" ? "todo" : "done" },
    ...booking.milestones.slice(1).map((m, i, arr): { label: string; time?: string; state: "done" | "current" | "todo" } => ({
      label: m.label,
      time: m.completedAt ? fmtTime(m.completedAt) : undefined,
      state: m.completedAt ? (arr.slice(i + 1).some((n) => n.completedAt) ? "done" : "current") : "todo",
    })),
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontFamily: font.extrabold, paddingBottom: 18, color: c.text }}>Job Tracking</Text>
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
      <PrimaryButton title="Contact Company" outline style={{ marginTop: 30 }} />
      <PrimaryButton
        title="View Job Details"
        onPress={() => navigation.navigate("JobDetails", { bookingId: booking.id })}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}

export function JobDetails({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "JobDetails">) {
  const booking = useBooking(route.params.bookingId);
  if (!booking) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Job Details" onBack={() => navigation.goBack()} />
      <Card style={{ marginBottom: 14, padding: 16 }}>
        <Text style={{ fontFamily: font.extrabold, fontSize: 16, color: c.text }}>{booking.company.name}</Text>
        <Text style={{ fontSize: 12, color: c.muted, marginTop: 4, fontFamily: font.regular }}>
          {booking.company.experienceYears}+ Years Experience · {booking.company.city}, {booking.company.state}
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 8, fontFamily: font.regular }}>
          📞 {booking.company.phone ?? "Shared after payment"}
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 4, fontFamily: font.regular }}>
          Machine Type: {booking.company.machineType}
        </Text>
      </Card>
      <StripedPlaceholder label="SITE PHOTO" style={{ height: 140, marginBottom: 22 }} />
      <PrimaryButton
        title="View Work Updates"
        onPress={() => navigation.navigate("WorkUpdates", { bookingId: booking.id })}
      />
    </ScrollView>
  );
}

export function WorkUpdates({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "WorkUpdates">) {
  const booking = useBooking(route.params.bookingId);
  if (!booking) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Work Updates" onBack={() => navigation.goBack()} />
      {booking.workUpdates.length === 0 && (
        <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>No updates yet.</Text>
      )}
      {booking.workUpdates.map((w) => (
        <View key={w.id} style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <StripedPlaceholder label="" style={{ width: 64, height: 64, borderRadius: 10 }} />
          <View>
            <Text style={{ fontSize: 14, fontFamily: font.bold, color: c.text }}>{w.label}</Text>
            <Text style={{ fontSize: 12, color: c.mutedLight, marginTop: 2, fontFamily: font.regular }}>
              {fmtTime(w.createdAt)}
            </Text>
          </View>
        </View>
      ))}
      {booking.invoice && (
        <PrimaryButton
          title="View Invoice"
          onPress={() => navigation.navigate("Invoice", { bookingId: booking.id })}
          style={{ marginTop: 10 }}
        />
      )}
    </ScrollView>
  );
}

export function InvoiceScreen({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "Invoice">) {
  const booking = useBooking(route.params.bookingId);
  if (!booking?.invoice) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const inv = booking.invoice;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Invoice" onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 12, color: c.mutedLight, fontFamily: font.regular }}>
        {inv.code} · {new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
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
          <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text }}>Total Payable to Company</Text>
          <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text }}>{inr(inv.total)}</Text>
        </View>
      </Card>
      <PrimaryButton title="Download Invoice" outline style={{ marginTop: 20 }} />
      <PrimaryButton
        title="Rate & Review"
        onPress={() => navigation.navigate("Review", { bookingId: booking.id, companyName: booking.company.name })}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}

export function Review({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "Review">) {
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
      setError(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 24, paddingTop: 40, alignItems: "center" }}>
      <Text style={{ fontSize: 20, fontFamily: font.extrabold, color: c.text }}>Rate &amp; Review</Text>
      <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
        How was your experience with {companyName}?
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
        placeholder="Write a review (optional)"
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
            <Text style={{ color: c.successText, fontFamily: font.bold, fontSize: 14 }}>Thanks for your review!</Text>
          </View>
          <PrimaryButton
            title="View My Bookings"
            onPress={() => navigation.navigate("MyBookings")}
            style={{ marginTop: 14, alignSelf: "stretch" }}
          />
        </>
      ) : (
        <PrimaryButton title="Submit Review" onPress={submit} busy={busy} style={{ marginTop: 18, alignSelf: "stretch" }} />
      )}
    </ScrollView>
  );
}

export function MyBookings({ navigation }: NativeStackScreenProps<CustomerStackParams, "MyBookings">) {
  const [bookings, setBookings] = useState<{ id: string; code: string; companyName: string; status: string }[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.myBookings().then(setBookings).catch(console.error);
    }, [])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingVertical: 16 }}>
      <Text style={{ fontSize: 20, fontFamily: font.extrabold, paddingHorizontal: 16, paddingBottom: 16, color: c.text }}>
        My Bookings
      </Text>
      {bookings.length === 0 && (
        <Text style={{ paddingHorizontal: 16, fontSize: 13, color: c.muted, fontFamily: font.regular }}>
          No bookings yet.
        </Text>
      )}
      {bookings.map((b) => (
        <Pressable key={b.id} onPress={() => navigation.navigate("Tracking", { bookingId: b.id })}>
          <Card
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginHorizontal: 16,
              marginBottom: 12,
            }}
          >
            <View>
              <Text style={{ fontFamily: font.bold, fontSize: 14, color: c.text }}>{b.code}</Text>
              <Text style={{ fontSize: 12, color: c.muted, marginTop: 2, fontFamily: font.regular }}>{b.companyName}</Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: font.bold, color: statusColor(b.status) }}>{statusLabel(b.status)}</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
