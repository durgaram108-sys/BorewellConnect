import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
  NotoSansDevanagari_800ExtraBold,
} from "@expo-google-fonts/noto-sans-devanagari";
import {
  NotoSansTelugu_500Medium,
  NotoSansTelugu_600SemiBold,
  NotoSansTelugu_700Bold,
  NotoSansTelugu_800ExtraBold,
} from "@expo-google-fonts/noto-sans-telugu";
import { loadTokens, hasCustomerToken, hasOwnerToken } from "./src/api";
import { c } from "./src/theme";
import { LanguageProvider } from "./src/i18n/LanguageContext";
import { ToastHost } from "./src/components/Toast";
import type { CustomerStackParams, OwnerStackParams, RootStackParams } from "./src/navigation";
import { RoleSelect } from "./src/screens/RoleSelect";
import { CustomerLogin, CustomerOtp, CompleteProfile } from "./src/screens/customer/AuthScreens";
import { CustomerHome, NewRequest, SelectLocation } from "./src/screens/customer/RequestScreens";
import { Quotations, QuoteDetail, BookingConfirm, Payment, CompanyProfileView } from "./src/screens/customer/QuoteScreens";
import {
  Tracking,
  JobDetails,
  WorkUpdates,
  InvoiceScreen,
  Review,
  MyBookings,
} from "./src/screens/customer/PostBookingScreens";
import {
  OwnerLogin,
  OwnerOtp,
  OwnerDashboard,
  NewLeads,
  ActiveJobs,
  JobUpdate,
  Earnings,
  OwnerProfile,
  EditProfile,
} from "./src/screens/owner/OwnerScreens";

const Root = createNativeStackNavigator<RootStackParams>();
const CustomerStack = createNativeStackNavigator<CustomerStackParams>();
const OwnerStack = createNativeStackNavigator<OwnerStackParams>();

function CustomerFlow() {
  return (
    <CustomerStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={hasCustomerToken() ? "CustomerHome" : "CustomerLogin"}
    >
      <CustomerStack.Screen name="CustomerLogin" component={CustomerLogin} />
      <CustomerStack.Screen name="CustomerOtp" component={CustomerOtp} />
      <CustomerStack.Screen name="CustomerHome" component={CustomerHome} />
      <CustomerStack.Screen name="CompleteProfile" component={CompleteProfile} />
      <CustomerStack.Screen name="NewRequest" component={NewRequest} />
      <CustomerStack.Screen name="SelectLocation" component={SelectLocation} />
      <CustomerStack.Screen name="Quotations" component={Quotations} />
      <CustomerStack.Screen name="QuoteDetail" component={QuoteDetail} />
      <CustomerStack.Screen name="CompanyProfile" component={CompanyProfileView} />
      <CustomerStack.Screen name="BookingConfirm" component={BookingConfirm} />
      <CustomerStack.Screen name="Payment" component={Payment} />
      <CustomerStack.Screen name="Tracking" component={Tracking} />
      <CustomerStack.Screen name="JobDetails" component={JobDetails} />
      <CustomerStack.Screen name="WorkUpdates" component={WorkUpdates} />
      <CustomerStack.Screen name="Invoice" component={InvoiceScreen} />
      <CustomerStack.Screen name="Review" component={Review} />
      <CustomerStack.Screen name="MyBookings" component={MyBookings} />
    </CustomerStack.Navigator>
  );
}

function OwnerFlow() {
  return (
    <OwnerStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={hasOwnerToken() ? "OwnerDashboard" : "OwnerLogin"}
    >
      <OwnerStack.Screen name="OwnerLogin" component={OwnerLogin} />
      <OwnerStack.Screen name="OwnerOtp" component={OwnerOtp} />
      <OwnerStack.Screen name="OwnerDashboard" component={OwnerDashboard} />
      <OwnerStack.Screen name="NewLeads" component={NewLeads} />
      <OwnerStack.Screen name="ActiveJobs" component={ActiveJobs} />
      <OwnerStack.Screen name="JobUpdate" component={JobUpdate} />
      <OwnerStack.Screen name="Earnings" component={Earnings} />
      <OwnerStack.Screen name="OwnerProfile" component={OwnerProfile} />
      <OwnerStack.Screen name="EditProfile" component={EditProfile} />
    </OwnerStack.Navigator>
  );
}

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: c.bg },
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [fontTimeout, setFontTimeout] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
    NotoSansDevanagari_800ExtraBold,
    NotoSansTelugu_500Medium,
    NotoSansTelugu_600SemiBold,
    NotoSansTelugu_700Bold,
    NotoSansTelugu_800ExtraBold,
  });

  useEffect(() => {
    loadTokens().finally(() => setReady(true));
    // Don't hang forever on font loading — fall back to system fonts.
    const t = setTimeout(() => setFontTimeout(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!ready || (!fontsLoaded && !fontError && !fontTimeout)) {
    return (
      <View style={{ flex: 1, minHeight: 400, backgroundColor: c.navy, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontSize: 16 }}>Loading Borewell Connect…</Text>
      </View>
    );
  }

  return (
    <LanguageProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="dark" />
        <Root.Navigator screenOptions={{ headerShown: false }}>
          <Root.Screen name="RoleSelect" component={RoleSelect} />
          <Root.Screen name="Customer" component={CustomerFlow} />
          <Root.Screen name="Owner" component={OwnerFlow} />
        </Root.Navigator>
        <ToastHost />
      </NavigationContainer>
    </LanguageProvider>
  );
}
