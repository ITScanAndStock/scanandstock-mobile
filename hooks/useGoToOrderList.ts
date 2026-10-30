import { useCallback } from "react";
import { useNavigation, useRouter } from "expo-router";

export function useGoToOrderList() {
  const navigation = useNavigation();
  const router = useRouter();

  return useCallback(() => {
    if ((navigation.getState()?.index ?? 0) > 0) {
      navigation.dispatch({ type: "POP_TO_TOP" });
    } else {
      router.replace("/orders");
    }
  }, [navigation, router]);
}
