import React, { useState } from "react";
import { Image, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import { WebView } from "react-native-webview";
import { api } from "../../api";
import { showToast } from "../../components/Toast";
import { c, font, inr } from "../../theme";
import { Card, PrimaryButton, ErrorText, ScreenTitle, SkeletonDetail, SkeletonList } from "../../components/ui";
import { bandLabel, computeTotalFromBands } from "../../utils/pricing";
import { useFetch } from "../../hooks/useFetch";
import type { CustomerStackParams } from "../../navigation";

export function Quotations({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "Quotations">) {
  const { requestId } = route.params;
  const { data, loading, refreshing, refresh } = useFetch(() => api.quotesFor(requestId), [requestId]);
  const quotes = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenTitle title={`Quotations (${quotes.length})`} onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 12, color: c.muted, marginTop: -10, marginBottom: 16, fontFamily: font.regular }}>
        Ranked by price, rating &amp; distance
      </Text>

      {loading ? (
        <SkeletonList />
      ) : (
        <>
          {quotes.length === 0 && (
            <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>
              No quotations yet — companies in your area have been notified.
            </Text>
          )}
          {quotes.map((q) => (
            <Pressable key={q.id} onPress={() => navigation.navigate("QuoteDetail", { requestId, quote: q })}>
              <Card
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                  borderWidth: q.isTop ? 1.5 : 1,
                  borderColor: q.isTop ? c.orange : c.border,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: q.isTop ? c.orange : c.navy,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 13, fontFamily: font.bold }}>{q.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Pressable onPress={() => navigation.navigate("CompanyProfile", { companyId: q.companyId })} hitSlop={4}>
                    <Text style={{ fontFamily: font.bold, fontSize: 14, color: c.text, textDecorationLine: "underline" }}>
                      {q.companyName}
                    </Text>
                  </Pressable>
                  <Text style={{ fontSize: 12, color: c.muted, marginTop: 2, fontFamily: font.regular }}>
                    ★ {q.rating} · {q.distanceKm} km away
                  </Text>
                  {q.isTop && (
                    <View
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: c.orange,
                        paddingVertical: 2,
                        paddingHorizontal: 8,
                        borderRadius: 999,
                        marginTop: 5,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontFamily: font.extrabold, color: "#fff" }}>BEST MATCH</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontFamily: font.extrabold, color: c.green, fontSize: 15 }}>{inr(q.totalPrice)}</Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function ScoreBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontSize: 12, color: c.muted, marginBottom: 4, fontFamily: font.regular }}>{label}</Text>
      <View style={{ backgroundColor: c.trackBg, borderRadius: 999, height: 8, overflow: "hidden" }}>
        <View style={{ height: 8, backgroundColor: color, width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </View>
    </View>
  );
}

export function QuoteDetail({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "QuoteDetail">) {
  const { quote } = route.params;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const drillingTotal = computeTotalFromBands(quote.bandRates, quote.depthFt);
  const drillingRate = drillingTotal / quote.depthFt;
  const pricePct = Math.max(10, 100 - (drillingRate - 170) * 2);
  const ratingPct = Math.round((quote.rating / 5) * 100);
  const distPct = Math.max(10, 100 - quote.distanceKm * 8);

  const book = async () => {
    setBusy(true);
    setError("");
    try {
      const booking = await api.book(quote.id);
      navigation.navigate("BookingConfirm", {
        bookingId: booking.id,
        code: booking.code,
        companyName: quote.companyName,
        totalPrice: quote.totalPrice,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Quotation Details" onBack={() => navigation.goBack()} />
      <Pressable onPress={() => navigation.navigate("CompanyProfile", { companyId: quote.companyId })}>
        <Text style={{ fontSize: 18, fontFamily: font.extrabold, color: c.text, textDecorationLine: "underline" }}>
          {quote.companyName}
        </Text>
      </Pressable>
      <Text style={{ fontSize: 12, color: c.muted, marginTop: 4, fontFamily: font.regular }}>
        {quote.yearsExperience}+ years experience · {quote.machineType} machine
      </Text>
      <Text style={{ fontSize: 26, fontFamily: font.extrabold, color: c.green, marginTop: 14 }}>
        {inr(quote.totalPrice)}
      </Text>
      <Text style={{ fontSize: 12, color: c.mutedLight, marginTop: 2, fontFamily: font.regular }}>
        For {quote.depthFt} ft drilling (avg ₹{Math.round(drillingRate)}/ft) + machine &amp; casing
      </Text>

      <Card style={{ marginTop: 16, padding: 14 }}>
        <Text style={{ fontSize: 12, fontFamily: font.bold, color: c.muted, marginBottom: 8 }}>RATE BREAKDOWN</Text>
        {quote.bandRates.map((rate, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 6,
              borderBottomWidth: i === quote.bandRates.length - 1 ? 0 : 1,
              borderBottomColor: c.trackBg,
            }}
          >
            <Text style={{ fontSize: 13, color: c.text, fontFamily: font.regular }}>{bandLabel(i)}</Text>
            <Text style={{ fontSize: 13, color: c.text, fontFamily: font.semibold }}>₹{rate}/ft</Text>
          </View>
        ))}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 6,
            borderTopWidth: 1,
            borderTopColor: c.trackBg,
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>Machine &amp; Casing Charges</Text>
          <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.semibold }}>{inr(quote.casingRate)}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10 }}>
          <Text style={{ fontSize: 14, color: c.text, fontFamily: font.extrabold }}>Total</Text>
          <Text style={{ fontSize: 14, color: c.green, fontFamily: font.extrabold }}>{inr(quote.totalPrice)}</Text>
        </View>
      </Card>

      <View style={{ marginTop: 8 }}>
        <ScoreBar label="Price competitiveness" pct={pricePct} color={c.green} />
        <ScoreBar label={`Rating (${quote.rating}★)`} pct={ratingPct} color={c.orange} />
        <ScoreBar label={`Proximity (${quote.distanceKm} km)`} pct={distPct} color={c.navy} />
      </View>

      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Book Now" onPress={book} busy={busy} style={{ marginTop: 28 }} />
    </ScrollView>
  );
}

export function BookingConfirm({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "BookingConfirm">) {
  const { bookingId, code, companyName, totalPrice } = route.params;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingTop: 24, alignItems: "center" }}>
      <View style={{ alignSelf: "stretch" }}>
        <ScreenTitle title="Booking Confirmed" onBack={() => navigation.goBack()} />
      </View>
      <Svg width={64} height={64} viewBox="0 0 64 64">
        <Circle cx={32} cy={32} r={30} fill={c.green} />
        <Path d="M20 33l8 8 16-18" stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={{ fontSize: 20, fontFamily: font.extrabold, marginTop: 18, color: c.text }}>Booking Confirmed!</Text>
      <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
        You've booked {companyName}
      </Text>
      <Card style={{ marginTop: 26, alignSelf: "stretch", alignItems: "center", padding: 16 }}>
        <Text style={{ fontSize: 11, color: c.mutedLight, fontFamily: font.regular }}>BOOKING ID</Text>
        <Text style={{ fontSize: 18, fontFamily: font.extrabold, marginTop: 4, color: c.text }}>{code}</Text>
        <Text style={{ fontSize: 11, color: c.mutedLight, marginTop: 14, fontFamily: font.regular }}>AGREED TOTAL</Text>
        <Text style={{ fontSize: 18, fontFamily: font.extrabold, marginTop: 4, color: c.green }}>{inr(totalPrice)}</Text>
      </Card>
      <Text style={{ fontSize: 12, color: c.mutedLight, marginTop: 16, fontFamily: font.regular }}>
        Company contact details will be shared after payment
      </Text>
      <PrimaryButton
        title="Proceed to Payment"
        onPress={() => navigation.navigate("Payment", { bookingId })}
        style={{ marginTop: 26, alignSelf: "stretch" }}
      />
    </ScrollView>
  );
}

const PAYMENT_METHODS = ["UPI", "Card", "Net Banking"] as const;

export function Payment({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "Payment">) {
  const { bookingId } = route.params;
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("UPI");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<{ orderId: string; keyId: string; amount: number } | null>(null);

  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const order = await api.payOrder(bookingId);
      if (order.mock) {
        // Mock mode: server accepts the deterministic mock signature.
        const paymentId = `pay_mock_${Date.now()}`;
        await api.payVerify(bookingId, {
          razorpayOrderId: order.orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: `mock_sig_${paymentId}`,
        });
        showToast("Payment successful");
        navigation.reset({
          index: 1,
          routes: [{ name: "CustomerHome" }, { name: "Tracking", params: { bookingId } }],
        });
      } else {
        setCheckout({ orderId: order.orderId, keyId: order.keyId, amount: order.amount });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  const onCheckoutMessage = async (data: string) => {
    try {
      const msg = JSON.parse(data);
      if (msg.event === "success") {
        await api.payVerify(bookingId, {
          razorpayOrderId: msg.razorpay_order_id,
          razorpayPaymentId: msg.razorpay_payment_id,
          razorpaySignature: msg.razorpay_signature,
        });
        setCheckout(null);
        showToast("Payment successful");
        navigation.reset({
          index: 1,
          routes: [{ name: "CustomerHome" }, { name: "Tracking", params: { bookingId } }],
        });
      } else if (msg.event === "dismiss") {
        setCheckout(null);
      }
    } catch {
      setCheckout(null);
      setError("Payment was not completed");
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Booking Fee" onBack={() => navigation.goBack()} />
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 36, fontFamily: font.extrabold, color: c.navy }}>₹500</Text>
        <Text
          style={{
            fontSize: 12,
            color: c.muted,
            marginTop: 6,
            maxWidth: 260,
            textAlign: "center",
            fontFamily: font.regular,
          }}
        >
          Balance amount is payable directly to the company after work completion
        </Text>
      </View>

      <View style={{ marginTop: 26, gap: 10 }}>
        {PAYMENT_METHODS.map((m) => {
          const active = method === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderWidth: active ? 1.5 : 1,
                borderColor: active ? c.green : c.border,
                borderRadius: 10,
                paddingVertical: 13,
                paddingHorizontal: 14,
                backgroundColor: "#fff",
              }}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  borderWidth: active ? 5 : 1.5,
                  borderColor: active ? c.green : "#C9C6BE",
                }}
              />
              <Text style={{ fontSize: 14, fontFamily: active ? font.semibold : font.regular, color: active ? c.text : c.muted }}>
                {m}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Pay ₹500 Securely" onPress={pay} busy={busy} style={{ marginTop: 24 }} />

      <Modal visible={!!checkout} animationType="slide" onRequestClose={() => setCheckout(null)}>
        {checkout && (
          <WebView
            originWhitelist={["*"]}
            source={{
              html: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var rzp = new Razorpay({
    key: ${JSON.stringify(checkout.keyId)},
    order_id: ${JSON.stringify(checkout.orderId)},
    amount: ${checkout.amount * 100},
    currency: "INR",
    name: "Borewell Connect",
    description: "Booking Fee",
    theme: { color: "#1FA463" },
    handler: function (resp) {
      resp.event = "success";
      window.ReactNativeWebView.postMessage(JSON.stringify(resp));
    },
    modal: { ondismiss: function () { window.ReactNativeWebView.postMessage(JSON.stringify({ event: "dismiss" })); } }
  });
  rzp.open();
</script></body></html>`,
            }}
            onMessage={(e) => onCheckoutMessage(e.nativeEvent.data)}
          />
        )}
      </Modal>
    </ScrollView>
  );
}

export function CompanyProfileView({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "CompanyProfile">) {
  const { companyId } = route.params;
  const { data: profile, loading, refreshing, refresh } = useFetch(() => api.companyProfile(companyId), [companyId]);

  if (loading || !profile) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
        <ScreenTitle title="Company Profile" onBack={() => navigation.goBack()} />
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
      <ScreenTitle title="Company Profile" onBack={() => navigation.goBack()} />
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <Text style={{ fontFamily: font.extrabold, fontSize: 18, color: c.text }}>{profile.name}</Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 8, fontFamily: font.regular }}>
          ★ {profile.ratingAvg} · {profile.experienceYears}+ years experience
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
          {profile.city}, {profile.state}
        </Text>
        <Text style={{ fontSize: 13, color: c.muted, marginTop: 6, fontFamily: font.regular }}>
          Machine Type: {profile.machineType}
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
      {profile.vehiclePhotos.length === 0 ? (
        <Text style={{ fontSize: 13, color: c.mutedLight, marginBottom: 20, fontFamily: font.regular }}>
          No photos yet.
        </Text>
      ) : (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          {profile.vehiclePhotos.map((p) => (
            <Image key={p.slot} source={{ uri: p.url }} style={{ flex: 1, height: 90, borderRadius: 10 }} />
          ))}
        </View>
      )}

      <Text style={{ fontSize: 12, fontFamily: font.bold, color: c.muted, marginBottom: 8 }}>
        BOREWELL WORK PHOTOS
      </Text>
      {profile.borewellPhotos.length === 0 ? (
        <Text style={{ fontSize: 13, color: c.mutedLight, fontFamily: font.regular }}>No photos yet.</Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {profile.borewellPhotos.map((photo) => (
            <Image key={photo.id} source={{ uri: photo.url }} style={{ width: 90, height: 90, borderRadius: 10 }} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
