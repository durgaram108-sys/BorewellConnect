import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Circle, Path } from "react-native-svg";
import { api, RequestRow } from "../../api";
import { c, font } from "../../theme";
import { Card, Field, FieldLabel, PrimaryButton, ErrorText, ScreenTitle, StripedPlaceholder } from "../../components/ui";
import type { CustomerStackParams } from "../../navigation";

const LAND_TYPES = ["Agriculture", "Residential", "Commercial"] as const;

export function CustomerHome({ navigation }: NativeStackScreenProps<CustomerStackParams, "CustomerHome">) {
  const [requests, setRequests] = useState<RequestRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.myRequests().then(setRequests).catch(console.error);
    }, [])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingVertical: 16 }}>
      <View style={{ backgroundColor: c.navy, borderRadius: 16, marginHorizontal: 16, marginBottom: 20, padding: 20 }}>
        <Text style={{ color: "#fff", fontSize: 19, fontFamily: font.extrabold }}>Hello!</Text>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4, fontFamily: font.regular }}>
          Need a borewell? Get quotes from verified companies near you.
        </Text>
        <Pressable
          onPress={() => navigation.navigate("NewRequest")}
          style={{
            backgroundColor: c.orange,
            borderRadius: 10,
            paddingVertical: 11,
            paddingHorizontal: 16,
            marginTop: 14,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontFamily: font.bold }}>+ New Request</Text>
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginHorizontal: 16,
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text }}>My Active Requests</Text>
        <Pressable onPress={() => navigation.navigate("MyBookings")}>
          <Text style={{ fontSize: 12, fontFamily: font.bold, color: c.green }}>My Bookings →</Text>
        </Pressable>
      </View>

      {requests.length === 0 && (
        <Text style={{ marginHorizontal: 16, fontSize: 13, color: c.muted, fontFamily: font.regular }}>
          No requests yet — create your first request above.
        </Text>
      )}
      {requests.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => navigation.navigate("Quotations", { requestId: r.id, code: r.code })}
        >
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
              <Text style={{ fontFamily: font.bold, fontSize: 14, color: c.text }}>{r.code}</Text>
              <Text style={{ fontSize: 12, color: c.muted, marginTop: 2, fontFamily: font.regular }}>
                {r.mandal}, {r.district}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: font.bold, color: c.green }}>
              {r.quoteCount} Quotation{r.quoteCount === 1 ? "" : "s"} →
            </Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function NewRequest({ navigation }: NativeStackScreenProps<CustomerStackParams, "NewRequest">) {
  const [district, setDistrict] = useState("Sangareddy");
  const [mandal, setMandal] = useState("Patancheru");
  const [landType, setLandType] = useState<(typeof LAND_TYPES)[number]>("Agriculture");
  const [depth, setDepth] = useState("350");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="New Request" onBack={() => navigation.goBack()} />
      <FieldLabel>DISTRICT</FieldLabel>
      <Field value={district} onChangeText={setDistrict} />
      <FieldLabel>MANDAL / AREA</FieldLabel>
      <Field value={mandal} onChangeText={setMandal} />
      <FieldLabel>LAND TYPE</FieldLabel>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {LAND_TYPES.map((t) => {
          const active = landType === t;
          return (
            <Pressable
              key={t}
              onPress={() => setLandType(t)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: active ? c.navy : "#fff",
                borderWidth: active ? 0 : 1,
                borderColor: c.border,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: font.semibold, color: active ? "#fff" : "#333" }}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
      <FieldLabel>EXPECTED DEPTH (FT)</FieldLabel>
      <Field value={depth} onChangeText={setDepth} keyboardType="number-pad" style={{ marginBottom: 22 }} />
      <PrimaryButton
        title="Next: Select Location"
        onPress={() =>
          navigation.navigate("SelectLocation", { district, mandal, landType, depthFt: Number(depth) || 0 })
        }
      />
    </ScrollView>
  );
}

export function SelectLocation({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "SelectLocation">) {
  const { district, mandal, landType, depthFt } = route.params;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Prototype ships a static pin; real geo-picking can swap in expo-location + a map SDK later.
  const lat = 17.5301;
  const lng = 78.1246;

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const req = await api.createRequest({ district, mandal, landType, depthFt, lat, lng });
      navigation.reset({
        index: 1,
        routes: [{ name: "CustomerHome" }, { name: "Quotations", params: { requestId: req.id, code: req.code } }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="Select Location" onBack={() => navigation.goBack()} />
      <View
        style={{
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ fontSize: 14, color: c.mutedLight, fontFamily: font.regular }}>Search location</Text>
      </View>
      <StripedPlaceholder label="MAP PREVIEW" style={{ height: 220, marginBottom: 14 }}>
      </StripedPlaceholder>
      <View style={{ position: "relative", marginTop: -140, alignItems: "center", marginBottom: 96 }}>
        <Svg width={34} height={46} viewBox="0 0 34 46">
          <Path
            d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 29 17 29s17-16.3 17-29C34 7.6 26.4 0 17 0z"
            fill={c.orange}
          />
          <Circle cx={17} cy={17} r={7} fill="#fff" />
        </Svg>
      </View>
      <Card style={{ marginBottom: 22 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 14, color: c.text }}>
          {mandal}, {district}
        </Text>
        <Text style={{ fontSize: 12, color: c.muted, marginTop: 4, fontFamily: font.regular }}>
          Telangana · Lat {lat}, Long {lng}
        </Text>
      </Card>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Confirm Location" onPress={confirm} busy={busy} />
    </ScrollView>
  );
}
