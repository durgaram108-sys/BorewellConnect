import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Circle, Path } from "react-native-svg";
import { WebView } from "react-native-webview";
import { api, RankedQuote } from "../../api";
import { showToast } from "../../components/Toast";
import { c, font, inr } from "../../theme";
import { Card, PrimaryButton, ErrorText, ScreenTitle } from "../../components/ui";
import type { CustomerStackParams } from "../../navigation";

export function Quotations({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "Quotations">) {
  const { requestId } = route.params;
  const [quotes, setQuotes] = useState<RankedQuote[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.quotesFor(requestId).then(setQuotes).catch(console.error);
    }, [requestId])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingVertical: 16 }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 4, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontSize: 20, color: c.text }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 20, fontFamily: font.extrabold, color: c.text }}>Quotations ({quotes.length})</Text>
      </View>
      <Text style={{ fontSize: 12, color: c.muted, paddingHorizontal: 16, paddingBottom: 16, fontFamily: font.regular }}>
        Ranked by price, rating &amp; distance
      </Text>

      {quotes.length === 0 && (
        <Text style={{ paddingHorizontal: 16, fontSize: 13, color: c.muted, fontFamily: font.regular }}>
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
              marginHorizontal: 16,
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
              <Text style={{ fontFamily: font.bold, fontSize: 14, color: c.text }}>{q.companyName}</Text>
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
            <Text style={{ fontFamily: font.extrabold, color: c.green, fontSize: 15 }}>₹{q.pricePerFt}/ft</Text>
          </Card>
        </Pressable>
      ))}
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

  const pricePct = Math.max(10, 100 - (quote.pricePerFt - 170) * 2);
  const ratingPct = Math.round((quote.rating / 5) * 100);
  const distPct = Math.max(10, 100 - quote.distanceKm * 8);

  const book = async () => {
    setBusy(true);
    setError("");
    try {
      const booking = await api.book(quote.id);
      navigation.navigate("BookingConfirm", { bookingId: booking.id, code: booking.code, companyName: quote.companyName });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Quotation Details" onBack={() => navigation.goBack()} />
      <Text style={{ fontSize: 18, fontFamily: font.extrabold, color: c.text }}>{quote.companyName}</Text>
      <Text style={{ fontSize: 12, color: c.muted, marginTop: 4, fontFamily: font.regular }}>
        {quote.yearsExperience}+ years experience · {quote.machineType} machine
      </Text>
      <Text style={{ fontSize: 26, fontFamily: font.extrabold, color: c.green, marginTop: 14 }}>
        ₹{quote.pricePerFt}/ft
      </Text>

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
  const { bookingId, code, companyName } = route.params;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 28, paddingTop: 60, alignItems: "center" }}>
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
