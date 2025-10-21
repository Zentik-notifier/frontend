import { useEffect } from 'react';
import { Linking } from 'react-native';
import { createOAuthRedirectLink, parseZentikLink } from '@/utils/universal-links';
import { useNavigationUtils } from '@/utils/navigation';

export function useOAuthDeepLink() {
  const { navigateToOAuth } = useNavigationUtils();

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    console.log('[OAuthDeepLink] Received URL:', url);

    try {
      const parsed = parseZentikLink(url);
      
      if (parsed?.type === 'oauth') {
        console.log('[OAuthDeepLink] OAuth callback detected:', parsed);
        
        // Build params for oauth callback page
        const oauthParams = new URLSearchParams();
        if (parsed.accessToken) oauthParams.set('accessToken', parsed.accessToken);
        if (parsed.refreshToken) oauthParams.set('refreshToken', parsed.refreshToken);
        if (parsed.connected) oauthParams.set('connected', 'true');
        if (parsed.provider) oauthParams.set('provider', parsed.provider);
        
        navigateToOAuth(oauthParams.toString());
      }
    } catch (error) {
      console.error('[OAuthDeepLink] Error parsing URL:', error);
    }
  };

  return {
    createOAuthRedirectLink,
  };
}

