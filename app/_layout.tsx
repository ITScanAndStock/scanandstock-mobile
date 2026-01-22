// import React native
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

// import expo
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";

// import components
import { AccountProvider } from "@/context/AccountContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StatsProvider } from "@/context/StatsContext";
import CustomSplashScreen from "../components/CustomSplashScreen";
import Header from "../components/Header";
import RootNavigator from "./RootNavigator";

function RootLayoutContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded, fontsError] = useFonts({
    Montserrat: require("../assets/fonts/Montserrat-Regular.ttf"),
    Medium: require("../assets/fonts/Montserrat-Medium.ttf"),
    SemiBold: require("../assets/fonts/Montserrat-SemiBold.ttf"),
    Light: require("../assets/fonts/Montserrat-Light.ttf"),
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (fontsError) {
      console.warn("Erreur chargement polices:", fontsError);
    }

    if ((fontsLoaded || fontsError) && !isLoading) {
      setAppIsReady(true);
    }
  }, [fontsLoaded, fontsError, isLoading]);

  if (!appIsReady) {
    return <CustomSplashScreen />;
  }

  return (
    <>
      <View
        style={{
          height: insets.top,
          backgroundColor: "#28343B",
        }}
      >
        <StatusBar style="light" />
      </View>
      <View style={{ flex: 1 }}>
        {isAuthenticated && <Header />}
        <RootNavigator />
        <Toast />
      </View>
      <View
        style={{
          height: insets.bottom,
          backgroundColor: "#fff",
        }}
      ></View>
    </>
  );
}

export default function RootLayout() {
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
