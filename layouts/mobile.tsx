import Header from "@/components/Header";
import { Stack } from "expo-router";
import { View } from "react-native";
import {
  useSafeAreaInsets
} from "react-native-safe-area-context";

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
          }}
        >
          {/* <Stack.Screen
            name="(mobile)/(home)/(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(mobile)/(settings)/index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(mobile)/(admin)/index"
            options={{
              headerShown: false,
            }}
          /> */}
          {/* <Stack.Screen
            name="(mobile)/(home)/notification/[id]"
            options={{
              headerShown: false,
            }}
          /> */}
          {/* <Stack.Screen
            name="(mobile)/(home)/bucket/settings/[id]"
            options={{
              headerShown: false,
            }}
          /> */}
        </Stack>
      </View>
    </View>
  );
}
