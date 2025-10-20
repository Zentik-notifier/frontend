import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import * as Linking2 from 'expo-linking';

export function useInviteCodeDeepLink() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Determine if running dev or prod app
  const isDev = process.env.EXPO_PUBLIC_APP_VARIANT === "development";

  useEffect(() => {
    // Handle deep link when app is opened from a closed state
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Handle deep link when app is already open
    const handleUrl = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    handleInitialURL();

    const subscription = Linking.addEventListener('url', handleUrl);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    console.log('[InviteCodeDeepLink] Received URL:', url);

    try {
      const parsed = Linking2.parse(url);

      // Custom scheme: zentik://invite/{code} or zentik.dev://invite/{code}
      if ((parsed.scheme === 'zentik' || parsed.scheme === 'zentik.dev') && parsed.hostname === 'invite' && parsed.path) {
        const code = parsed.path.replace(/^\//, '');
        if (code) {
          console.log('[InviteCodeDeepLink] Extracted invite code from custom scheme:', code);
          setInviteCode(code);
          return;
        }
      }

      // Universal link: https://notifier.zentik.app/invite/{code}?env=dev
      if (parsed.scheme === 'https' && parsed.hostname === 'notifier.zentik.app' && parsed.path?.startsWith('/invite/')) {
        const code = parsed.path.replace('/invite/', '');
        if (code) {
          console.log('[InviteCodeDeepLink] Extracted invite code from universal link:', code);
          setInviteCode(code);
          return;
        }
      }
    } catch (error) {
      console.error('[InviteCodeDeepLink] Error parsing URL:', error);
    }
  };

  const clearInviteCode = () => {
    setInviteCode(null);
  };

  const createInviteLink = (code: string): string => {
    // Create universal link with env parameter for dev builds
    // This ensures the web redirect page opens the correct app
    const envParam = isDev ? '?env=dev' : '';
    return `https://notifier.zentik.app/invite/${code}${envParam}`;
  };

  return {
    inviteCode,
    clearInviteCode,
    createInviteLink,
  };
}

