import Header from "@/components/Header";
import HomeSidebar from "@/components/HomeSidebar";
import SettingsSidebar from "@/components/SettingsSidebar";
import UserDropdown from "@/components/UserDropdown";
import { useI18n } from "@/hooks";
import { Slot, Stack, useSegments } from "expo-router";
import { View } from "react-native";

export default function TabletLayout() {
  const { t } = useI18n();
  const segments = useSegments();
  const segments1 = segments[1];

  // if (segments1 === "(home)") {
  //   return (
  //     <View style={{ flex: 1, flexDirection: "row" }}>
  //       <HomeSidebar />
  //       <View
  //         style={{
  //           flexGrow: 1,
  //           flexShrink: 1,
  //           flexBasis: 0,
  //           overflow: "hidden",
  //         }}
  //       >
  //         {/* <Slot /> */}
  //         <Stack
  //           screenOptions={{
  //             headerShown: true,
  //             headerTitle: t("common.settings"),
  //           }}
  //         ></Stack>
  //       </View>
  //     </View>
  //   );
  // }

  return (
    <Stack>
      <Stack.Screen
        name="(tablet)/(home)"
        options={{
          header: () => <Header />,
        }}
      />
    </Stack>
  );
}
