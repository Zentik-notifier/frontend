import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import * as Linking2 from 'expo-linking';

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

    // Parse URL: zentik://invite/{code}
    const parsed = Linking2.parse(url);
    
    if (parsed.hostname === 'invite' && parsed.path) {
      const code = parsed.path.replace(/^\//, ''); // Remove leading slash
      if (code) {
        console.log('[InviteCodeDeepLink] Extracted invite code:', code);
        setInviteCode(code);
      }
    }
  };

  const clearInviteCode = () => {
    setInviteCode(null);
  };

  const createInviteLink = (code: string): string => {
    return `zentik://invite/${code}`;
  };

  return {
    inviteCode,
    clearInviteCode,
    createInviteLink,
  };
}

