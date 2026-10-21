// import React native
import React, { useEffect } from "react";
import { View } from "react-native";
import "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

// import expo
import { useFonts } from "expo-font";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";

// import components
import { isTablet } from "@/constants/layout";
import { AccountProvider } from "@/context/AccountContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StatsProvider } from "@/context/StatsContext";
import CustomSplashScreen from "../components/CustomSplashScreen";
import RootNavigator from "./RootNavigator";

function RootLayoutContent() {
  const { isLoading } = useAuth();
  const [fontsLoaded, fontsError] = useFonts({
    Montserrat: require("../assets/fonts/Montserrat-Regular.ttf"),
    Medium: require("../assets/fonts/Montserrat-Medium.ttf"),
    SemiBold: require("../assets/fonts/Montserrat-SemiBold.ttf"),
    Light: require("../assets/fonts/Montserrat-Light.ttf"),
  });
  const insets = useSafeAreaInsets();

  const appIsReady = (fontsLoaded || !!fontsError) && !isLoading;

  useEffect(() => {
    if (fontsError) {
      console.warn("Erreur chargement polices:", fontsError);
    }
  }, [fontsError]);

  if (!appIsReady) {
    return <CustomSplashScreen />;
  }

  return (
    <>
      <View
        style={{
          height: insets.top,
          backgroundColor: "#27333A",
        }}
      >
        <StatusBar style="light" />
      </View>
      <View style={{ flex: 1 }}>
        <RootNavigator />
        <Toast />
      </View>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (!isTablet()) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, []);

  return (
    <AuthProvider>
      <AccountProvider>
        <StatsProvider>
          <RootLayoutContent />
        </StatsProvider>
      </AccountProvider>
    </AuthProvider>
  );
}
