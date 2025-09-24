import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { useColorScheme, useI18n } from "@/hooks";
import { useNavigationUtils } from "@/utils/navigation";
import { HeaderBackButton } from "@react-navigation/elements";
import { Stack } from "expo-router";
import { useLocalSearchParams } from "expo-router/build/hooks";

export default function TabletLayout() {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const { navigateToHome } = useNavigationUtils();
  const { forceFetch } = useLocalSearchParams();

  return (
    <Stack>
      <Stack.Screen
        name="(mobile)/(home)/(tabs)"
        options={{
          headerTitle: t("common.home"),
          header: () => <Header />,
        }}
      />
      <Stack.Screen
        name="(mobile)/(settings)/index"
        options={{
          headerTitle: t("common.settings"),
        }}
      />
      <Stack.Screen
        name="(mobile)/(admin)/index"
        options={{
          headerTitle: t("administration.title"),
        }}
      />
      <Stack.Screen
        name="(mobile)/(home)/notification/[id]"
        options={{
          headerTitle: "",
          headerLeft: (props) =>
            forceFetch ? (
              <HeaderBackButton
                {...props}
                tintColor={Colors[colorScheme].text}
                label={t("common.home")} // testo accanto all’icona
                onPress={navigateToHome}
              />
            ) : undefined,
        }}
      />
      <Stack.Screen
        name="(mobile)/(home)/bucket/settings/[id]"
        options={{
          headerTitle: t("buckets.form.editTitle"),
        }}
      />
    </Stack>
  );
}
