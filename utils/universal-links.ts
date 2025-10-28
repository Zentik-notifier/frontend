import { Platform } from 'react-native';

const PWA_DOMAIN = 'https://notifier.zentik.app';
const isDev = process.env.EXPO_PUBLIC_APP_VARIANT === "development";

/**
 * Get the custom scheme for the current build
 */
export const getCustomScheme = (): string => {
  return isDev ? 'zentik.dev' : 'zentik';
};

/**
 * Creates a universal link for invite code redemption
 * @param code - Invite code
 * @returns Universal link that redirects to the app
 */
export const createInviteLink = (code: string): string => {
  const envParam = isDev ? '?env=dev' : '';
  return `${PWA_DOMAIN}/invite/${code}${envParam}`;
};

/**
 * Creates a universal link for OAuth callback
 * @param provider - OAuth provider name (e.g., 'google', 'github')
 * @returns Universal link for OAuth redirect
 */
export const createOAuthRedirectLink = (): string => {
  const scheme = getCustomScheme();
  if (Platform.OS === 'web') {
    try {
      // Use current origin to support dev and prod seamlessly
      const origin = typeof window !== 'undefined' && window.location ? window.location.origin : PWA_DOMAIN;
      return `${origin}/oauth`;
    } catch {
      // Fallback to PWA domain if window is not available
      return `${PWA_DOMAIN}/oauth`;
    }
  }
  return `${scheme}:///oauth`;

};

/**
 * Creates a universal link for notification detail
 * @param notificationId - Notification ID
 * @returns Universal link to notification
 */
export const createNotificationLink = (notificationId: string): string => {
  const envParam = isDev ? '?env=dev' : '';
  return `${PWA_DOMAIN}/notifications/${notificationId}${envParam}`;
};

/**
 * Parses an incoming universal link or custom scheme URL
 * @param url - The incoming URL
 * @returns Parsed components or null if not a valid Zentik link
 */
export const parseZentikLink = (url: string): {
  type: 'invite' | 'oauth' | 'notification' | 'unknown';
  code?: string;
  notificationId?: string;
  provider?: string;
  accessToken?: string;
  refreshToken?: string;
  connected?: boolean;
  env?: string;
} | null => {
  try {
    const urlObj = new URL(url);

    // Parse query params
    const env = urlObj.searchParams.get('env') || undefined;

    // Check for invite link
    const inviteMatch = urlObj.pathname.match(/^\/invite\/([^/]+)$/);
    if (inviteMatch) {
      return { type: 'invite', code: inviteMatch[1], env };
    }

    // Check for OAuth callback
    // Format: /oauth/{provider} or /oauth (for backward compatibility)
    const oauthMatch = urlObj.pathname.match(/^\/oauth(?:\/([^/]+))?$/);
    if (oauthMatch) {
      const provider = oauthMatch[1] || undefined;

      // Parse tokens from hash (format: #accessToken=xxx&refreshToken=yyy)
      let accessToken: string | undefined;
      let refreshToken: string | undefined;
      let connected: boolean | undefined;

      if (urlObj.hash) {
        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
        accessToken = hashParams.get('accessToken') || undefined;
        refreshToken = hashParams.get('refreshToken') || undefined;
        const connectedParam = hashParams.get('connected');
        connected = connectedParam === 'true' ? true : undefined;
      }

      return {
        type: 'oauth',
        provider,
        accessToken,
        refreshToken,
        connected,
        env
      };
    }

    // Check for notification link
    const notificationMatch = urlObj.pathname.match(/^\/notifications\/([^/]+)$/);
    if (notificationMatch) {
      return { type: 'notification', notificationId: notificationMatch[1], env };
    }

    return { type: 'unknown' };
  } catch (error) {
    console.error('[UniversalLinks] Error parsing URL:', error);
    return null;
  }
};

