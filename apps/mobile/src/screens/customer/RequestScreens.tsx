import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Location from "expo-location";
import { api, RequestRow, setCustomerToken } from "../../api";
import { c, font } from "../../theme";
import { Card, Field, FieldLabel, PrimaryButton, ErrorText, ScreenTitle } from "../../components/ui";
import { SelectField } from "../../components/Picker";
import { CalendarField } from "../../components/CalendarField";
import { SelectLocationMap } from "../../components/SelectLocationMap";
import { DISTRICTS_BY_STATE, INDIA_STATES } from "../../data/indiaLocations";
import { MAX_DEPTH_FT } from "../../utils/pricing";
import type { CustomerStackParams } from "../../navigation";

const LAND_TYPES = ["Agriculture", "Residential", "Commercial"] as const;

const newRequestSchema = z.object({
  country: z.string().min(1, "Enter country"),
  state: z.string().min(1, "Enter state"),
  district: z.string().min(1, "Enter district"),
  mandal: z.string().min(1, "Enter mandal/area"),
  landType: z.enum(LAND_TYPES),
  depth: z
    .string()
    .min(1, "Enter the expected depth")
    .refine((v) => Number(v) > 0, "Enter a valid depth in feet")
    .refine((v) => Number(v) <= MAX_DEPTH_FT, `Max depth is ${MAX_DEPTH_FT} ft`),
  preferredDate: z.date({ required_error: "Select the date you need this done by" }),
});
type NewRequestForm = z.infer<typeof newRequestSchema>;

export function CustomerHome({ navigation }: NativeStackScreenProps<CustomerStackParams, "CustomerHome">) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [name, setName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.myRequests().then(setRequests).catch(console.error);
      api.customerProfile().then((p) => setName(p.name)).catch(console.error);
    }, [])
  );

  const logout = async () => {
    await setCustomerToken(null);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: "RoleSelect" }] });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingVertical: 16 }}>
      <View style={{ backgroundColor: c.navy, borderRadius: 16, marginHorizontal: 16, marginBottom: 20, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 19, fontFamily: font.extrabold }}>Hello{name ? `, ${name}` : ""}!</Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4, fontFamily: font.regular }}>
              Need a borewell? Get quotes from verified companies near you.
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("CompleteProfile")}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15 }}>⚙</Text>
          </Pressable>
        </View>
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

      <Pressable onPress={logout} style={{ marginTop: 20, alignItems: "center" }}>
        <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.danger }}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

export function NewRequest({ navigation }: NativeStackScreenProps<CustomerStackParams, "NewRequest">) {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewRequestForm>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: {
      country: "India",
      state: "",
      district: "",
      mandal: "",
      landType: "Agriculture",
      depth: "",
      preferredDate: undefined as unknown as Date,
    },
  });
  const selectedState = watch("state");

  const onSubmit = (data: NewRequestForm) => {
    navigation.navigate("SelectLocation", {
      country: data.country.trim(),
      state: data.state.trim(),
      district: data.district.trim(),
      mandal: data.mandal.trim(),
      landType: data.landType,
      depthFt: Number(data.depth),
      preferredDate: data.preferredDate.toISOString(),
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title="New Request" onBack={() => navigation.goBack()} />
      <FieldLabel>COUNTRY</FieldLabel>
      <Controller
        control={control}
        name="country"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} placeholder="e.g. India" />}
      />
      <ErrorText>{errors.country?.message}</ErrorText>
      <FieldLabel>STATE</FieldLabel>
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
            placeholder="Select State"
          />
        )}
      />
      <ErrorText>{errors.state?.message}</ErrorText>
      <FieldLabel>DISTRICT</FieldLabel>
      <Controller
        control={control}
        name="district"
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
      <ErrorText>{errors.district?.message}</ErrorText>
      <FieldLabel>MANDAL / AREA</FieldLabel>
      <Controller
        control={control}
        name="mandal"
        render={({ field: { value, onChange } }) => <Field value={value} onChangeText={onChange} placeholder="e.g. Patancheru" />}
      />
      <ErrorText>{errors.mandal?.message}</ErrorText>
      <FieldLabel>LAND TYPE</FieldLabel>
      <Controller
        control={control}
        name="landType"
        render={({ field: { value, onChange } }) => (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {LAND_TYPES.map((t) => {
              const active = value === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => onChange(t)}
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
        )}
      />
      <FieldLabel>EXPECTED DEPTH (FT, MAX {MAX_DEPTH_FT})</FieldLabel>
      <Controller
        control={control}
        name="depth"
        render={({ field: { value, onChange } }) => (
          <Field
            value={value}
            onChangeText={onChange}
            keyboardType="number-pad"
            placeholder="e.g. 350"
            style={{ marginBottom: 8 }}
          />
        )}
      />
      <ErrorText>{errors.depth?.message}</ErrorText>
      <FieldLabel>DATE REQUIRED BY</FieldLabel>
      <Controller
        control={control}
        name="preferredDate"
        render={({ field: { value, onChange } }) => (
          <CalendarField mode="single" value={value ?? null} onChange={onChange} placeholder="Select a date" />
        )}
      />
      <ErrorText>{errors.preferredDate?.message}</ErrorText>
      <Text style={{ fontSize: 11, color: c.mutedLight, marginTop: -6, marginBottom: 8, fontFamily: font.regular }}>
        Only companies available on this date will be sent your request.
      </Text>
      <PrimaryButton title="Next: Select Location" onPress={handleSubmit(onSubmit)} style={{ marginTop: 14 }} />
    </ScrollView>
  );
}

export function SelectLocation({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "SelectLocation">) {
  const { country, state, district, mandal, landType, depthFt, preferredDate } = route.params;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchLocation = useCallback(async () => {
    setLocating(true);
    setError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied — enable it in your device settings to capture the site's GPS location.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get GPS location");
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const confirm = async () => {
    if (!coords) return setError("Waiting for GPS location — make sure location services are enabled.");
    setBusy(true);
    setError("");
    try {
      const req = await api.createRequest({
        country,
        state,
        district,
        mandal,
        landType,
        depthFt,
        preferredDate,
        lat: coords.lat,
        lng: coords.lng,
      });
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
        <Text style={{ fontSize: 14, color: c.mutedLight, fontFamily: font.regular }}>
          {locating ? "Fetching your site's GPS location…" : "Site GPS location"}
        </Text>
      </View>
      {coords && (
        <SelectLocationMap
          lat={coords.lat}
          lng={coords.lng}
          onChange={(next) => setCoords(next)}
        />
      )}
      <Card style={{ marginBottom: 22 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 14, color: c.text }}>
          {mandal}, {district}
        </Text>
        <Text style={{ fontSize: 12, color: c.muted, marginTop: 4, fontFamily: font.regular }}>
          {state}, {country}
          {coords ? ` · Lat ${coords.lat.toFixed(5)}, Long ${coords.lng.toFixed(5)}` : ""}
        </Text>
        <Text style={{ fontSize: 12, color: c.muted, marginTop: 4, fontFamily: font.regular }}>
          Required by {new Date(preferredDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </Text>
      </Card>
      <ErrorText>{error}</ErrorText>
      {!locating && !coords && (
        <PrimaryButton title="Retry GPS Location" onPress={fetchLocation} style={{ marginBottom: 12 }} />
      )}
      <PrimaryButton title="Confirm Location" onPress={confirm} busy={busy || locating} />
    </ScrollView>
  );
}
