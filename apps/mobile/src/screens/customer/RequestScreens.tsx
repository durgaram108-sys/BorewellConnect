import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { api, RequestRow, setCustomerToken } from "../../api";
import { c, font, localeFor } from "../../theme";
import { Card, Field, FieldLabel, PrimaryButton, ErrorText, ScreenTitle, SkeletonList } from "../../components/ui";
import { SelectField } from "../../components/Picker";
import { useFetch } from "../../hooks/useFetch";
import { useTranslation } from "../../i18n/LanguageContext";
import { CalendarField } from "../../components/CalendarField";
import { SelectLocationMap } from "../../components/SelectLocationMap";
import { DISTRICTS_BY_STATE, INDIA_STATES } from "../../data/indiaLocations";
import { MAX_DEPTH_FT } from "../../utils/pricing";
import type { CustomerStackParams } from "../../navigation";

const LAND_TYPES = ["Agriculture", "Residential", "Commercial"] as const;
const LAND_TYPE_LABEL_KEYS: Record<(typeof LAND_TYPES)[number], string> = {
  Agriculture: "newRequest.landTypeAgriculture",
  Residential: "newRequest.landTypeResidential",
  Commercial: "newRequest.landTypeCommercial",
};

function makeNewRequestSchema(t: (key: string, vars?: Record<string, string | number>) => string) {
  return z.object({
    country: z.string().min(1, t("newRequest.countryRequired")),
    state: z.string().min(1, t("newRequest.stateRequired")),
    district: z.string().min(1, t("newRequest.districtRequired")),
    mandal: z.string().min(1, t("newRequest.mandalRequired")),
    landType: z.enum(LAND_TYPES),
    depth: z
      .string()
      .min(1, t("newRequest.depthRequired"))
      .refine((v) => Number(v) > 0, t("newRequest.depthInvalid"))
      .refine((v) => Number(v) <= MAX_DEPTH_FT, t("newRequest.depthMax", { max: MAX_DEPTH_FT })),
    preferredDate: z.date({ required_error: t("newRequest.dateRequired") }),
  });
}
type NewRequestForm = z.infer<ReturnType<typeof makeNewRequestSchema>>;

export function CustomerHome({ navigation }: NativeStackScreenProps<CustomerStackParams, "CustomerHome">) {
  const { t } = useTranslation();
  const { data, loading, refreshing, refresh } = useFetch(
    () => Promise.all([api.myRequests(), api.customerProfile()]).then(([requests, profile]) => ({ requests, name: profile.name })),
    []
  );
  const requests = data?.requests ?? [];
  const name = data?.name ?? null;

  const logout = async () => {
    await setCustomerToken(null);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: "RoleSelect" }] });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={{ backgroundColor: c.navy, borderRadius: 16, marginBottom: 20, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 19, fontFamily: font.extrabold }}>
              {t("customerHome.hello", { name: name ? `, ${name}` : "" })}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4, fontFamily: font.regular }}>
              {t("customerHome.tagline")}
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
            <Feather name="settings" size={16} color="#fff" />
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
          <Text style={{ color: "#fff", fontSize: 14, fontFamily: font.bold }}>{t("customerHome.newRequest")}</Text>
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text }}>{t("customerHome.myActiveRequests")}</Text>
        <Pressable onPress={() => navigation.navigate("MyBookings")}>
          <Text style={{ fontSize: 12, fontFamily: font.bold, color: c.green }}>{t("customerHome.myBookings")}</Text>
        </Pressable>
      </View>

      {loading ? (
        <SkeletonList rows={2} />
      ) : (
        <>
          {requests.length === 0 && (
            <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular }}>{t("customerHome.noRequests")}</Text>
          )}
          {requests.map((r) => (
            <Pressable key={r.id} onPress={() => navigation.navigate("Quotations", { requestId: r.id, code: r.code })}>
              <Card
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
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
                  {r.quoteCount} {r.quoteCount === 1 ? t("customerHome.quotation") : t("customerHome.quotations")} →
                </Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}

      <Pressable onPress={logout} style={{ marginTop: 20, alignItems: "center" }}>
        <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.danger }}>{t("common.logOut")}</Text>
      </Pressable>
    </ScrollView>
  );
}

export function NewRequest({ navigation }: NativeStackScreenProps<CustomerStackParams, "NewRequest">) {
  const { t } = useTranslation();
  const newRequestSchema = useMemo(() => makeNewRequestSchema(t), [t]);
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
      <ScreenTitle title={t("newRequest.title")} onBack={() => navigation.goBack()} />
      <FieldLabel>{t("newRequest.country").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="country"
        render={({ field: { value, onChange } }) => (
          <Field value={value} onChangeText={onChange} placeholder={t("newRequest.countryPlaceholder")} />
        )}
      />
      <ErrorText>{errors.country?.message}</ErrorText>
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
          <Field value={value} onChangeText={onChange} placeholder={t("newRequest.mandalPlaceholder")} />
        )}
      />
      <ErrorText>{errors.mandal?.message}</ErrorText>
      <FieldLabel>{t("newRequest.landType").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="landType"
        render={({ field: { value, onChange } }) => (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {LAND_TYPES.map((lt) => {
              const active = value === lt;
              return (
                <Pressable
                  key={lt}
                  onPress={() => onChange(lt)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: active ? c.navy : "#fff",
                    borderWidth: active ? 0 : 1,
                    borderColor: c.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: font.semibold, color: active ? "#fff" : "#333" }}>
                    {t(LAND_TYPE_LABEL_KEYS[lt])}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      />
      <FieldLabel>{t("newRequest.depth", { max: MAX_DEPTH_FT }).toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="depth"
        render={({ field: { value, onChange } }) => (
          <Field
            value={value}
            onChangeText={onChange}
            keyboardType="number-pad"
            placeholder={t("newRequest.depthPlaceholder")}
            style={{ marginBottom: 8 }}
          />
        )}
      />
      <ErrorText>{errors.depth?.message}</ErrorText>
      <FieldLabel>{t("newRequest.dateRequiredBy").toUpperCase()}</FieldLabel>
      <Controller
        control={control}
        name="preferredDate"
        render={({ field: { value, onChange } }) => (
          <CalendarField mode="single" value={value ?? null} onChange={onChange} placeholder={t("newRequest.selectDate")} />
        )}
      />
      <ErrorText>{errors.preferredDate?.message}</ErrorText>
      <Text style={{ fontSize: 11, color: c.mutedLight, marginTop: -6, marginBottom: 8, fontFamily: font.regular }}>
        {t("newRequest.dateHint")}
      </Text>
      <PrimaryButton title={t("newRequest.next")} onPress={handleSubmit(onSubmit)} style={{ marginTop: 14 }} />
    </ScrollView>
  );
}

export function SelectLocation({ navigation, route }: NativeStackScreenProps<CustomerStackParams, "SelectLocation">) {
  const { t, language } = useTranslation();
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
        setError(t("selectLocation.permissionDenied"));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("selectLocation.gpsFailed"));
    } finally {
      setLocating(false);
    }
  }, [t]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const confirm = async () => {
    if (!coords) return setError(t("selectLocation.waitingForGps"));
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
      setError(e instanceof Error ? e.message : t("selectLocation.createFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <ScreenTitle title={t("selectLocation.title")} onBack={() => navigation.goBack()} />
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
          {locating ? t("selectLocation.fetchingGps") : t("selectLocation.siteGps")}
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
          {t("selectLocation.requiredBy", {
            date: new Date(preferredDate).toLocaleDateString(localeFor(language), { day: "numeric", month: "short", year: "numeric" }),
          })}
        </Text>
      </Card>
      <ErrorText>{error}</ErrorText>
      {!locating && !coords && (
        <PrimaryButton title={t("selectLocation.retryGps")} onPress={fetchLocation} style={{ marginBottom: 12 }} />
      )}
      <PrimaryButton title={t("selectLocation.confirm")} onPress={confirm} busy={busy || locating} />
    </ScrollView>
  );
}
