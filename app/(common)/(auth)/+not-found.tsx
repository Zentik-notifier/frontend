import { Link, Stack, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useI18n } from "@/hooks/useI18n";
import { Icon, Surface, Text, useTheme } from "react-native-paper";

export default function NotFoundScreen() {
  const pathname = usePathname();
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.content}>
          <Icon 
            source="alert-circle-outline" 
            size={120} 
            color={theme.colors.error} 
          />
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onBackground }]}>
            404
          </Text>
          <Text variant="headlineSmall" style={[styles.subtitle, { color: theme.colors.onBackground }]}>
            {t("notFound.title")}
          </Text>
          <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.onBackground }]}>
            {t("notFound.description")}
          </Text>
          <Text variant="bodyMedium" style={[styles.path, { color: theme.colors.onBackground, backgroundColor: theme.colors.surface }]}>
            {pathname}
          </Text>
          <Link href="/" style={styles.link}>
            <Surface style={[styles.button, { backgroundColor: theme.colors.primary }]} elevation={2}>
              <Text variant="titleMedium" style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
                {t("notFound.goHome")}
              </Text>
            </Surface>
          </Link>
        </View>
      </Surface>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontWeight: "bold",
    marginTop: 8,
  },
  subtitle: {
    textAlign: "center",
    fontWeight: "600",
  },
  description: {
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 24,
  },
  path: {
    textAlign: "center",
    opacity: 0.6,
    fontFamily: "monospace",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  link: {
    marginTop: 24,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 160,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
});
