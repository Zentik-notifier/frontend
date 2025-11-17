import React, { createContext, useContext, useState, useCallback } from 'react';
import { IncomingNotificationToast } from '../components/IncomingNotificationToast';

interface NotificationToastData {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  icon?: string;
  onPress?: () => void;
  duration?: number;
  bucketColor?: string;
  deliveryType?: string;
}

interface NotificationToastContextValue {
  showNotification: (data: Omit<NotificationToastData, 'id'>) => void;
  hideNotification: () => void;
}

const NotificationToastContext = createContext<
  NotificationToastContextValue | undefined
>(undefined);

export const useNotificationToast = () => {
  const context = useContext(NotificationToastContext);
  if (!context) {
    throw new Error(
      'useNotificationToast must be used within NotificationToastProvider'
    );
  }
  return context;
};

export const NotificationToastProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationToastData | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  const showNotification = useCallback((data: Omit<NotificationToastData, 'id'>) => {
    const id = `notification-${Date.now()}`;
    setNotification({ ...data, id });
    setVisible(true);
  }, []);

  const hideNotification = useCallback(() => {
    setVisible(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    // Clear notification data after animation
    setTimeout(() => {
      setNotification(null);
    }, 300);
  }, []);

  const value: NotificationToastContextValue = {
    showNotification,
    hideNotification,
  };

  return (
    <NotificationToastContext.Provider value={value}>
      {children}
      {notification && (
        <IncomingNotificationToast
          title={notification.title}
          body={notification.body}
          imageUrl={notification.imageUrl}
          icon={notification.icon}
          visible={visible}
          onDismiss={handleDismiss}
          onPress={notification.onPress}
          duration={notification.duration}
          bucketColor={notification.bucketColor}
          deliveryType={notification.deliveryType}
        />
      )}
    </NotificationToastContext.Provider>
  );
};
