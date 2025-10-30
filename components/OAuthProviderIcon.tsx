import React from "react";
import { View, ViewStyle } from "react-native";
import { Icon } from "react-native-paper";
import { Image } from "expo-image";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import {
  OAuthProviderType,
  usePublicAppConfigQuery,
} from "@/generated/gql-operations-generated";

type Props = {
  providerType: OAuthProviderType;
  size?: number; // outer container size (square)
  iconSize?: number; // inner icon size
  backgroundColor?: string;
  style?: ViewStyle;
  circular?: boolean; // force circular shape
  marginRight?: number; // right spacing
};

export default function OAuthProviderIcon({
  providerType,
  size = 28,
  iconSize = 18,
  backgroundColor,
  style,
  circular = true,
  marginRight = 12,
}: Props) {
  const { data } = usePublicAppConfigQuery({ fetchPolicy: "cache-first" });
  const providers = data?.publicAppConfig.oauthProviders || [];

  let provider = providers.find((p) => p.type === providerType);

  if (!provider && providerType === OAuthProviderType.AppleSignin) {
    provider = providers.find((p) => p.type === OAuthProviderType.Apple);
  }

  const isAppleLike =
    providerType === OAuthProviderType.Apple ||
    providerType === OAuthProviderType.AppleSignin;

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: circular ? size / 2 : Math.max(4, Math.round(size / 6)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: backgroundColor ?? provider?.color ?? undefined,
    marginRight,
    ...(style || {}),
  };

  // For Apple Sign In, force specific icon with white background as requested
  if (providerType === OAuthProviderType.AppleSignin) {
    return (
      <View style={{ ...containerStyle, backgroundColor: "#FFFFFF" }}>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/128/15/15476.png",
          }}
          style={{ width: iconSize, height: iconSize }}
        />
      </View>
    );
  }

  if (provider?.iconUrl) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: provider.iconUrl }}
          style={{ width: iconSize, height: iconSize }}
        />
      </View>
    );
  }

  // Special handling for Apple
  if (isAppleLike) {
    if (Platform.OS === "ios") {
      return (
        <View style={containerStyle}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={Math.max(3, Math.round(size / 10))}
            style={{ width: iconSize, height: iconSize }}
            onPress={() => {}}
          />
        </View>
      );
    }
    return (
      <View style={containerStyle}>
        <Icon source="apple" size={iconSize} />
      </View>
    );
  }

  const name = getFallbackIconName(providerType);
  return (
    <View style={containerStyle}>
      <Icon source={name} size={iconSize} />
    </View>
  );
}

function getFallbackIconName(type: OAuthProviderType): string {
  switch (type) {
    case OAuthProviderType.Github:
      return "github";
    case OAuthProviderType.Google:
      return "google";
    case OAuthProviderType.Discord:
      return "discord";
    case OAuthProviderType.Local:
      return "account";
    default:
      return "key";
  }
}
