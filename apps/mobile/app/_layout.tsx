import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { store, useAppDispatch, useAppSelector } from "@/store/store";
import { useEffect } from "react";
import { restoreSession } from "@/store/auth/authThunk";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";


const isLoggedIn = false;

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider >
        <GestureHandlerRootView >
          <BottomSheetModalProvider>
            <AppNavigation />
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Provider>
  );
}

const AppNavigation = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  const isLoggedIn = !!user?.userId;
  return (
    <Stack
      screenOptions={{ headerShown: false }}
      key={isLoggedIn ? "user" : "guest"}
    >
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="private" />
      </Stack.Protected>
    </Stack>
  );
};
