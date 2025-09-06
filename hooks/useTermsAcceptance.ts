import { useEffect, useState } from 'react';
import { hasAcceptedTerms, subscribeToTermsChanges } from '../services/auth-storage';

/**
 * Hook to check if the user has accepted the required terms
 */
export const useTermsAcceptance = () => {
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTermsAcceptance();
    
    // Subscribe to terms changes
    const unsubscribe = subscribeToTermsChanges(() => {
      console.log('Terms acceptance status changed, refreshing...');
      checkTermsAcceptance();
    });

    return unsubscribe;
  }, []);

  const checkTermsAcceptance = async () => {
    try {
      const accepted = await hasAcceptedTerms();
      setTermsAccepted(accepted);
    } catch (error) {
      console.error('Error checking terms acceptance:', error);
      setTermsAccepted(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshTermsStatus = () => {
    setLoading(true);
    checkTermsAcceptance();
  };

  return {
    termsAccepted,
    loading,
    refreshTermsStatus,
  };
};
