import { Platform } from "react-native";

export function formatFileSize(bytes: number, decimals: number = 1): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const dm = Math.max(0, Math.min(4, Math.floor(decimals)));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const IS_FS_SUPPORTED = Platform.OS !== 'web';
export const IS_SQLITE_SUPPORTED = Platform.OS !== 'web';