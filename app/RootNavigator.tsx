// import React native
import React from "react";
import "react-native-reanimated";

// import expo
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

function AuthStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="login"
        options={{
          presentation: "card",
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}

function AppStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="(tabs)"
        options={{
          presentation: "modal",
          animationTypeForReplace: "push",
          animation: "slide_from_left",
        }}
      />
      <Stack.Screen
        name="scanner"
        options={{
          presentation: "card",
          animation: "fade",
          contentStyle: { backgroundColor: "#1C2529" },
        }}
      />
      <Stack.Screen
        name="commandes/[id]"
        options={{
          presentation: "card",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="commandes/reception/[id]"
        options={{
          presentation: "card",
          animation: "fade",
          contentStyle: { backgroundColor: "#1C2529" },
        }}
      />
      <Stack.Screen
        name="commandes/reception/confirmee/[id]"
        options={{
          presentation: "card",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: colors.SURFACE },
        }}
      />
      <Stack.Screen
        name="stock/[id]"
        options={{
          presentation: "card",
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colors.SURFACE },
        }}
      />
    </Stack>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.WHITE,
        }}
      >
        <ActivityIndicator size="large" color={colors.DARK} />
      </View>
    );
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />;
}
