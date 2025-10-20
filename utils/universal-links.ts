import Constants from 'expo-constants';

const PWA_DOMAIN = 'https://notifier.zentik.app';

/**
 * Determines if running dev or prod app based on build configuration
 */
export const isDevelopmentBuild = (): boolean => {
  return Constants.expoConfig?.scheme === 'zentik.dev';
};

/**
 * Get the custom scheme for the current build
 */
export const getCustomScheme = (): string => {
  return isDevelopmentBuild() ? 'zentik.dev' : 'zentik';
};

/**
 * Creates a universal link for invite code redemption
 * @param code - Invite code
 * @returns Universal link that redirects to the app
 */
export const createInviteLink = (code: string): string => {
  const envParam = isDevelopmentBuild() ? '?env=dev' : '';
  return `${PWA_DOMAIN}/invite/${code}${envParam}`;
};

/**
 * Creates a universal link for OAuth callback
 * @param path - Optional path after oauth (default: '/(mobile)/public/oauth')
 * @returns Universal link for OAuth redirect
 */
export const createOAuthRedirectLink = (path: string = '/(mobile)/public/oauth'): string => {
  const envParam = isDevelopmentBuild() ? '?env=dev' : '';
  return `${PWA_DOMAIN}/oauth${envParam}&path=${encodeURIComponent(path)}`;
};

/**
 * Creates a universal link for notification detail
 * @param notificationId - Notification ID
 * @returns Universal link to notification
 */
export const createNotificationLink = (notificationId: string): string => {
  const envParam = isDevelopmentBuild() ? '?env=dev' : '';
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
  path?: string;
  env?: string;
} | null => {
  try {
    const urlObj = new URL(url);
    
    // Parse query params
    const env = urlObj.searchParams.get('env') || undefined;
    const path = urlObj.searchParams.get('path') || undefined;
    
    // Check for invite link
    const inviteMatch = urlObj.pathname.match(/^\/invite\/([^/]+)$/);
    if (inviteMatch) {
      return { type: 'invite', code: inviteMatch[1], env };
    }
    
    // Check for OAuth callback
    if (urlObj.pathname === '/oauth') {
      return { type: 'oauth', path, env };
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

