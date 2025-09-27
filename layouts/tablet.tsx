import Header from "@/components/Header";
import { useI18n } from "@/hooks";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabletLayout() {
  const { isDesktop } = useDeviceType();
  const insets = useSafeAreaInsets();
  
  // Ottieni i colori del tema
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const cardBackground = useThemeColor({}, 'background');

  // Calcola l'altezza totale dell'header (safe area + appbar)
  const headerHeight = insets.top + 64; // 48 è l'altezza dell'Appbar

  const content = (
    <View style={{ flex: 1 }}>
      <Header />
      <View style={{ flex: 1, paddingTop: headerHeight }}>
        <Stack 
          screenOptions={{ 
            headerShown: false, // Header custom, non mostrare quello di default
            animation: 'slide_from_right',
            animationDuration: 200,
          }}
        >
          <Stack.Screen
            name="(tablet)/(home)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(tablet)/(settings)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(tablet)/(admin)"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </View>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={[styles.webContainer, { backgroundColor }]}>
        <View style={[styles.webContentWrapper, { backgroundColor: cardBackground }]}>{content}</View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  webContentWrapper: {
    width: "100%",
    maxWidth: 1200,
    height: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});
