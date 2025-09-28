import Header from "@/components/Header";
import { useI18n } from "@/hooks";
import { HeaderBackButton } from "@react-navigation/elements";
import { Stack } from "expo-router";
import { useLocalSearchParams } from "expo-router/build/hooks";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { View } from "react-native";

export default function TabletLayout() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  // const colorScheme = useColorScheme();
  // const { navigateToHome } = useNavigationUtils();
  // const { forceFetch } = useLocalSearchParams();

  // Calcola l'altezza totale dell'header (safe area + appbar)
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
