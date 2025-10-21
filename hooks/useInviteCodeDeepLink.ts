import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { parseZentikLink, createInviteLink } from '@/utils/universal-links';

export function useInviteCodeDeepLink() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);

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
      const parsed = parseZentikLink(url);
      
      if (parsed?.type === 'invite' && parsed.code) {
        console.log('[InviteCodeDeepLink] Extracted invite code:', parsed.code);
        setInviteCode(parsed.code);
        return;
      }
    } catch (error) {
      console.error('[InviteCodeDeepLink] Error parsing URL:', error);
    }
  };

  const clearInviteCode = () => {
    setInviteCode(null);
  };

  return {
    inviteCode,
    clearInviteCode,
    createInviteLink,
  };
}

