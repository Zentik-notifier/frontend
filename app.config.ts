import { ConfigContext, ExpoConfig } from '@expo/config';
import 'tsx/cjs';

// Set these in .env locally
// APP_VARIANT=development

const isDev = process.env.APP_VARIANT === "development";
const bundleIdentifier = isDev ? "com.apocaliss92.zentik.dev" : "com.apocaliss92.zentik";
const name = isDev ? "Zentik Dev" : "Zentik";

const commonEntitlements = {
    "com.apple.security.application-groups": [
        `group.${bundleIdentifier}`
    ],
    "keychain-access-groups": [
        `$(AppIdentifierPrefix)${bundleIdentifier}.keychain`,
        "$(AppIdentifierPrefix)*"
    ],
}

const config = ({ config }: ConfigContext): ExpoConfig => {
    return {
        ...config,
        name,
        slug: "zentik",
        version: "1.4.7",
        orientation: "default",
        icon: "./assets/icons/generators/glas_default.png",
        scheme: "zentik",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        splash: {
            image: "./assets/images/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff",
            dark: {
                image: "./assets/images/splash-icon-dark.png",
                backgroundColor: "#6c6363",
            },
        },
        assetBundlePatterns: ["**/*"],
        ios: {
            supportsTablet: true,
            bundleIdentifier,
            appleTeamId: "C3F24V5NS5",
            buildNumber: "40",
            icon: "./assets/icons/generators/glas_default.png",
            // icon: {
            //     light: "./assets/icons/generators/glas_default.png",
            //     dark: "./assets/icons/generators/glas_dark.png",
            //     tinted: "./assets/icons/generators/glas_tinted_light.png",
            // },
            googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './keys/GoogleService-Info.plist',
            infoPlist: {
                NSUserNotificationUsageDescription: "This app uses notifications to send you important updates about your buckets and notifications.",
                UIBackgroundModes: ["remote-notification", "fetch"],
                NSPhotoLibraryAddUsageDescription: "Zentik needs access to your photo library to save media attachments to your gallery.",
                NSPhotoLibraryUsageDescription: "Zentik needs access to your photo library to save and show media attachments.",
                NSAppTransportSecurity: {
                    NSAllowsArbitraryLoads: true,
                },
                ITSAppUsesNonExemptEncryption: false,
                NSUserActivityTypes: ["INSendMessageIntent"],
            },
            entitlements: {
                "aps-environment": "production",
                ...commonEntitlements
            },
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/icons/generators/glas_default.png",
                backgroundColor: "#ffffff",
            },
            package: bundleIdentifier,
            versionCode: 40,
            googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './keys/google-services.json',
            permissions: [
                "android.permission.RECEIVE_BOOT_COMPLETED",
                "android.permission.WAKE_LOCK",
                "com.google.android.c2dm.permission.RECEIVE",
                "android.permission.VIBRATE",
                "android.permission.USE_FULL_SCREEN_INTENT"
            ],
            softwareKeyboardLayoutMode: "pan",
            allowBackup: true
        },
        web: {
            bundler: "metro",
            output: "static",
            favicon: "./assets/icons/icon-192x192.png",
            manifest: {
                name,
                short_name: name,
                description: "Notification management system",
                theme_color: "#0a7ea4",
                background_color: "#ffffff",
                display: "standalone",
                orientation: "default",
                icons: [
                    { src: "./assets/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
                    { src: "./assets/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
                    { src: "./assets/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
                    { src: "./assets/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
                    { src: "./assets/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
                    { src: "./assets/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
                    { src: "./assets/icons/icon-256x256.png", sizes: "256x256", type: "image/png" },
                    { src: "./assets/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
                    { src: "./assets/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
                ],
            },
        },
        plugins: [
            "expo-web-browser",
            "expo-router",
            "expo-localization",
            "expo-background-task",
            [
                "expo-screen-orientation",
                {
                    "initialOrientation": "DEFAULT"
                }
            ],
            "expo-sqlite",
            [
                "expo-splash-screen",
                {
                    backgroundColor: "#ffffff",
                    image: "./assets/icons/generators/glas_default.png",
                    imageWidth: 200,
                    resizeMode: "contain",
                    dark: {
                        image: "./assets/icons/generators/glas_dark.png",
                        backgroundColor: "#6c6363"
                    }
                },
            ],
            "expo-secure-store",
            [
                "expo-notifications",
                {
                    icon: "./assets/icons/notification-ios.png",
                    color: "#0a7ea4",
                    defaultChannel: "default",
                    sounds: [],
                },
            ],
            ["@react-native-firebase/app"],
            ["@react-native-firebase/messaging"],
            [
                "expo-build-properties",
                {
                    "ios": {
                        "useFrameworks": "static",
                        "buildReactNativeFromSource": true,
                    },
                    "android": {
                        "compileSdkVersion": 35,
                        "targetSdkVersion": 35,
                        "minSdkVersion": 24,
                        "buildToolsVersion": "35.0.0",
                        "enableProguardInReleaseBuilds": false,
                        "enableSeparateBuildPerCPUArchitecture": false,
                        "enableHermes": true,
                        "enableNewArchitecture": true
                    }
                }
            ],
            "expo-video",
            "expo-audio",
            "expo-media-library",
            ["./plugins/withIosNotificationExtensions/withIosNotificationExtensions.ts"],
            ["./plugins/withAndroidManifestFix/withAndroidManifestFix.ts"],
            ["./plugins/withCustomAppDelegate/withCustomAppDelegate.ts"]
        ],

        experiments: {
            typedRoutes: true,
        },
        extra: {
            eas: {
                projectId: "17f4d8f2-e90d-4862-ae67-97592dbcb8b7",
                build: {
                    experimental: {
                        ios: {
                            appExtensions: [
                                {
                                    targetName: "ZentikNotificationService",
                                    bundleIdentifier: `${bundleIdentifier}.ZentikNotificationService`,
                                    entitlements: {
                                        ...commonEntitlements
                                    },
                                },
                                {
                                    targetName: "ZentikNotificationContentExtension",
                                    bundleIdentifier: `${bundleIdentifier}.ZentikNotificationContentExtension`,
                                    entitlements: {
                                        ...commonEntitlements
                                    },
                                }
                            ]
                        }
                    }
                }
            },
        },
        owner: "apocaliss92",
        runtimeVersion: "1.0.0",
        updates: {
            url: "https://u.expo.dev/17f4d8f2-e90d-4862-ae67-97592dbcb8b7",
        },
    }
};

export default config;