import { useGetUserDevicesQuery } from '@/generated/gql-operations-generated';
import { getStoredDeviceToken } from '@/services/auth-storage';
import { useEffect, useState } from 'react';

export function useDeviceRegistrationStatus(skip?: boolean) {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const { data: userDevicesData, loading: devicesLoading } = useGetUserDevicesQuery({
    skip,
  });

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const storedToken = await getStoredDeviceToken();

        if (!storedToken) {
          setIsRegistered(false);
          setIsLoading(false);
          return;
        }

        if (userDevicesData?.userDevices) {
          const currentDevice = userDevicesData.userDevices.find(
            device => device?.deviceToken === storedToken
          );
          setIsRegistered(!!currentDevice);
        } else {
          setIsRegistered(true);
        }
      } catch (error) {
        console.error('Error checking device registration status:', error);
        setIsRegistered(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (!devicesLoading) {
      checkRegistrationStatus();
    }
  }, [userDevicesData, devicesLoading, refresh]);

  return {
    isRegistered,
    isLoading: isLoading || devicesLoading,
    refresh: () => setRefresh(!refresh),
  };
}
