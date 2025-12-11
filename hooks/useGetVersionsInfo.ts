import Constants from "expo-constants";
import packageJson from "../package.json";
import { Platform } from "react-native";
import { useMemo } from "react";
import { useGetBackendVersionQuery } from "@/generated/gql-operations-generated";

export interface VersionsInfo {
    appVersion?: string | null;
    dockerVersion?: string | null;
    nativeVersion?: string | null;
    backendVersion?: string | null;
}

export const useGetVersionsInfo = () => {
    const { data, loading, refetch, error } = useGetBackendVersionQuery();

    const versions = useMemo(() => {
        const backendVersion = data?.getBackendVersion;
        const showNativeVersion = Platform.OS !== "web";
        const nativeVersion = showNativeVersion
            ? Constants.expoConfig?.version || "unknown"
            : undefined;
        const appVersion = packageJson.version || "unknown";
        const isSelfHosted = process.env.EXPO_PUBLIC_SELFHOSTED === "true";
        const dockerVersion = isSelfHosted
            ? packageJson.dockerVersion || "unknown"
            : null;

        return {
            nativeVersion,
            appVersion,
            dockerVersion,
            backendVersion
        };
    }, [data]);

    return {
        versions,
        loading,
        refetch,
        error
    }
}