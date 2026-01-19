import { ConfigContext, ExpoConfig } from '@expo/config';
import 'tsx/cjs';

// Set these in .env locally
// APP_VARIANT=development

const isDev = process.env.APP_VARIANT === "development";
const bundleIdentifier = isDev ? "com.apocaliss92.zentik.dev" : "com.apocaliss92.zentik";
const productionBundleIdentifier = "com.apocaliss92.zentik";
export const name = isDev ? "Zentik Dev" : "Zentik";
const scheme = isDev ? "zentik.dev" : "zentik";

export const commonEntitlements = {
    "com.apple.security.application-groups": [
        `group.${bundleIdentifier}`
    ],
    "keychain-access-groups": [
        `$(AppIdentifierPrefix)${bundleIdentifier}.keychain`,
        "$(AppIdentifierPrefix)*"
    ],
    "com.apple.developer.icloud-services": [
        "CloudKit",
        "CloudDocuments"
    ],
    "com.apple.developer.icloud-container-identifiers": isDev 
        ? [
            `iCloud.${bundleIdentifier}`, // Dev container
            `iCloud.${productionBundleIdentifier}` // Production container (for testing)
        ]
        : [
            `iCloud.${bundleIdentifier}` // Production container only
        ],
    "com.apple.developer.ubiquity-kvstore-identifier": `$(TeamIdentifierPrefix)${bundleIdentifier}`,
}

const config = ({ config }: ConfigContext): ExpoConfig => {
    return {
        ...config,
        name,
        slug: "zentik",
        version: "1.6.30",
        orientation: "default",
        icon: "./assets/icons/generators/glas_default.png",
        scheme,
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
            privacyManifests: {
                NSPrivacyAccessedAPITypes: [
                    {
                        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
                        NSPrivacyAccessedAPITypeReasons: ["C617.1"],
                    },
                ],
            },
            supportsTablet: true,
            bundleIdentifier,
            appleTeamId: "C3F24V5NS5",
            buildNumber: "84",
            usesAppleSignIn: true,
            associatedDomains: [
                "applinks:notifier.zentik.app"
            ],
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
            versionCode: 84,
            googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './keys/google-services.json',
            permissions: [
                "android.permission.RECEIVE_BOOT_COMPLETED",
                "android.permission.WAKE_LOCK",
                "com.google.android.c2dm.permission.RECEIVE",
                "android.permission.VIBRATE",
                "android.permission.USE_FULL_SCREEN_INTENT"
            ],
            intentFilters: [
                {
                    action: "VIEW",
                    autoVerify: true,
                    data: [
                        {
                            scheme: "https",
                            host: "notifier.zentik.app",
                            pathPrefix: "/invite"
                        }
                    ],
                    category: ["BROWSABLE", "DEFAULT"]
                }
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
            "expo-apple-authentication",
            "expo-background-task",
            "expo-asset",
            [
                "expo-share-extension",
                {
                    "excludedPackages": [
                        "expo-dev-client",
                        "expo-splash-screen",
                        "expo-updates",
                        "expo-font",
                    ],
                    "activationRules": [
                        {
                            "type": "file",
                            "max": 3
                        },
                        {
                            "type": "image",
                            "max": 2
                        },
                        {
                            "type": "video",
                            "max": 1
                        },
                        {
                            "type": "text"
                        },
                        {
                            "type": "url",
                            "max": 1
                        }
                    ]
                }
            ],
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
            "@bacons/apple-targets",
            ["./plugins/withIosNotificationExtensions/withIosNotificationExtensions.ts"],
            ["./plugins/withAndroidManifestFix/withAndroidManifestFix.ts"],
            ["./plugins/withCustomAppDelegate/withCustomAppDelegate.ts"],
            ["./plugins/withWidgetReload/withWidgetReload.ts"],
            ["./plugins/withDatabaseAccessBridge/withDatabaseAccessBridge.ts"]
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
                                },
                                {
                                    targetName: "ZentikShareExtension",
                                    bundleIdentifier: `${bundleIdentifier}.ShareExtension`,
                                    entitlements: {
                                        ...commonEntitlements
                                    },
                                },
                                {
                                    targetName: "WidgetExtension",
                                    bundleIdentifier: `${bundleIdentifier}.WidgetExtension`,
                                    entitlements: {
                                        ...commonEntitlements
                                    },
                                },
                                {
                                    targetName: "WatchExtension",
                                    bundleIdentifier: `${bundleIdentifier}.WatchExtension`,
                                    entitlements: {
                                        "aps-environment": "production", // Required for CloudKit remote notifications
                                        ...commonEntitlements
                                    },
                                }
                            ]
                        }
                    }
                }
            },
        },
        owner: "zentik-notifier",
        runtimeVersion: "1.0.1",
        updates: {
            url: "https://u.expo.dev/17f4d8f2-e90d-4862-ae67-97592dbcb8b7",
        },
    }
};

export default config;