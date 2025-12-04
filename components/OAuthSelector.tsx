import { useAppContext } from "@/contexts/AppContext";
import {
  MobileAppleAuthDto,
  OAuthProviderPublicFragment,
  OAuthProviderType,
  useAppleLoginMobileMutation,
  usePublicAppConfigQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppLog } from "@/hooks/useAppLog";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Device from "expo-device";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Divider, Text, useTheme } from "react-native-paper";
import {
  MenuOption,
  MenuOptions,
  MenuTrigger,
  Menu as PopupMenu,
} from "react-native-popup-menu";
import OAuthProviderIcon from "./OAuthProviderIcon";

type Props = {
  onProviderSelect: (provider: OAuthProviderPublicFragment) => void;
  disabled?: boolean;
  onSuccess?: () => void;
};

export function OAuthSelector({ onProviderSelect, disabled, onSuccess }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const { data } = usePublicAppConfigQuery({ fetchPolicy: "cache-first" });
  const providersSrc = data?.publicAppConfig.oauthProviders || [];
  const [anchorWidth, setAnchorWidth] = useState(0);
  const { completeAuth } = useAppContext();
  const [appleLoginMobile] = useAppleLoginMobileMutation();
  const [providers, setProviders] = useState<OAuthProviderPublicFragment[]>([]);
  const { logAppEvent } = useAppLog();

  useEffect(() => {
    const func = async () => {
      const iosSigninAvailable =
        Platform.OS === "ios"
          ? await AppleAuthentication.isAvailableAsync()
          : false;

      if (iosSigninAvailable) {
        return [
          {
            __typename: "OAuthProviderPublicDto",
            id: "apple_signin",
            type: OAuthProviderType.AppleSignin,
            name: "Apple Sign-In",
            iconUrl: "https://www.apple.com/favicon.ico",
            color: "#000000",
            textColor: "#FFFFFF",
            providerKey: "apple_signin",
          } as OAuthProviderPublicFragment,
          ...providersSrc,
        ];
      } else {
        return providersSrc;
      }
    };

    func().then((foundProviders) => {
      setProviders(foundProviders);
    });
  }, [providersSrc]);

  // const estimatedRowHeight = 44; // approx row height
  // const estimatedDivider = 1;
  // const estimatedMenuHeight =
  //   providers.length > 0
  //     ? providers.length * estimatedRowHeight +
  //       (providers.length - 1) * estimatedDivider
  //     : 0;

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, ...rest } = credential;
      if (!identityToken) {
        throw new Error("Missing identityToken in response");
      }
      const platformLabel =
        Platform.OS === "ios"
          ? "IOS"
          : Platform.OS === "android"
          ? "ANDROID"
          : "WEB";
      const input: MobileAppleAuthDto = {
        identityToken,
        payload: JSON.stringify(rest),
        deviceName: Device.deviceName ?? undefined,
        platform: platformLabel,
        osVersion: Device.osVersion ?? undefined,
        browser:
          Platform.OS === "web"
            ? typeof navigator !== "undefined"
              ? navigator.userAgent
              : undefined
            : undefined,
      };

      console.log("🔎 AppleLoginMobile GQL input:", input);
      const { data } = await appleLoginMobile({ variables: { input } });
      console.log("🔎 AppleLoginMobile GQL response:", data);
      const accessToken = data?.appleLoginMobile?.accessToken;
      const refreshToken = data?.appleLoginMobile?.refreshToken;
      if (accessToken && refreshToken) {
        await completeAuth(accessToken, refreshToken);
        onSuccess?.();
      } else {
        throw new Error("Missing tokens in response");
      }
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return;
      try {
        const graphQLErrors = (e?.graphQLErrors || []).map((err: any) => ({
          message: err?.message,
          locations: err?.locations,
          path: err?.path,
        }));
        console.error("❌ AppleLoginMobile GQL error:", {
          message: e?.message,
          graphQLErrors,
          networkError: e?.networkError?.message,
        });
        logAppEvent({
          event: "auth_oauth_apple_login_failed",
          level: "error",
          message: e?.message,
          context: "OAuthSelector.handleAppleSignIn",
          error: e,
          data: { graphQLErrors },
        }).catch(() => {});
      } catch {
        logAppEvent({
          event: "auth_oauth_apple_login_failed",
          level: "error",
          message: (e as any)?.message,
          context: "OAuthSelector.handleAppleSignIn",
          error: e,
        }).catch(() => {});
      }
      console.error("Apple SignIn failed:", e);
    }
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => setAnchorWidth(e.nativeEvent.layout.width)}
    >
      <PopupMenu>
        <MenuTrigger
          customStyles={{ triggerWrapper: styles.fullWidth }}
          disabled={disabled || providers.length === 0}
        >
          <View style={styles.fullWidth}>
            <Button
              mode="outlined"
              style={styles.fullWidth}
              pointerEvents="none"
            >
              {t("login.orContinueWith")}
            </Button>
          </View>
        </MenuTrigger>
        <MenuOptions
          customStyles={{
            optionsContainer: {
              width: anchorWidth || undefined,
              padding: 0,
              marginTop: -52,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              borderWidth: StyleSheet.hairlineWidth,
            },
          }}
        >
          {providers.map((p: any, idx: number) => (
            <React.Fragment key={p.id}>
              <MenuOption
                onSelect={() => {
                  if (p.type === OAuthProviderType.AppleSignin) {
                    handleAppleSignIn();
                  } else {
                    onProviderSelect(p);
                  }
                }}
              >
                <View
                  style={[
                    styles.optionRow,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <OAuthProviderIcon
                    providerType={p.type}
                    provider={p}
                    size={28}
                    iconSize={18}
                    backgroundColor={p.color || theme.colors.primary}
                    style={styles.iconWrapper}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: theme.colors.onSurface },
                    ]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                </View>
              </MenuOption>
              {idx < providers.length - 1 && (
                <Divider
                  style={[
                    styles.menuDivider,
                    { backgroundColor: theme.colors.outlineVariant },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </MenuOptions>
      </PopupMenu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  fullWidth: {
    width: "100%",
  },
  menuContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  oauthMenuButton: {
    width: "100%",
    borderRadius: 0,
    marginVertical: 0,
  },
  oauthMenuButtonContent: {
    height: 48,
    paddingVertical: 0,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#00000022",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionButton: {
    flex: 1,
    justifyContent: "flex-start",
  },
  optionButtonContent: {
    height: 36,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  appleButtonWrapper: {
    width: "100%",
    marginBottom: 8,
  },
  appleButton: {
    width: "100%",
    height: 44,
  },
});
