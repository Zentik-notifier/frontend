import Header from "@/components/Header";
import { Stack } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabletLayout() {
  const insets = useSafeAreaInsets();

  const headerHeight = insets.top + 64; // 48 è l'altezza dell'Appbar

  return (
    <View style={{ flex: 1 }}>
      <Header />
      <View style={{ flex: 1, paddingTop: headerHeight }}>
        <Stack
          screenOptions={{
            headerShown: false,
            freezeOnBlur: true,
          }}
        >
        </Stack>
      </View>
    </View>
  );
}
