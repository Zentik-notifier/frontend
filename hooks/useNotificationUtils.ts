import { MediaType, NotificationActionType, NotificationDeliveryType, NotificationFragment } from "@/generated/gql-operations-generated";
import { useI18n } from "./useI18n";

/**
 * Hook for notification utility functions that supports both GraphQL and REST enums
 */
export const useNotificationUtils = () => {
  const { t } = useI18n();

  const getDeliveryTypeIcon = (deliveryType: NotificationDeliveryType): string => {
    switch (deliveryType) {
      case NotificationDeliveryType.Silent:
        return "volume-off"; // Silenzioso - no suono
      case NotificationDeliveryType.Normal:
        return "bell"; // Normale - notifica standard
      case NotificationDeliveryType.Critical:
        return "bell-alert"; // Critico - notifica urgente
      case NotificationDeliveryType.NoPush:
        return "database"; // No Push - solo salvataggio DB
      default:
        return "bell";
    }
  };

  const getDeliveryTypeColor = (deliveryType: NotificationDeliveryType) => {
    switch (deliveryType) {
      case NotificationDeliveryType.Critical:
        return "#dc3545";
      case NotificationDeliveryType.Silent:
        return "#6c757d";
      case NotificationDeliveryType.NoPush:
        return "#9c27b0"; // Purple/Tertiary color
      default:
        return undefined;
    }
  };


  const getActionTypeIcon = (actionType: NotificationActionType): string => {
    switch (actionType) {
      case NotificationActionType.Navigate:
        return "open-in-new";
      case NotificationActionType.Webhook:
        return "web";
      case NotificationActionType.BackgroundCall:
        return "api";
      case NotificationActionType.Snooze:
        return "clock";
      case NotificationActionType.MarkAsRead:
        return "check";
      case NotificationActionType.OpenNotification:
        return "eye";
      case NotificationActionType.Delete:
        return "delete";
      default:
        return "cog";
    }
  };

  const getMediaTypeIcon = (mediaType: MediaType): string => {
    switch (mediaType) {
      case MediaType.Image:
        return "image";
      case MediaType.Gif:
        return "file-image";
      case MediaType.Video:
        return "video";
      case MediaType.Audio:
        return "music";
      case MediaType.Icon:
        return "star";
      default:
        return "image";
    }
  };

  const getMediaTypeColor = (mediaType: MediaType) => {
    switch (mediaType) {
      case MediaType.Image:
        return '#2196F3'; // Blue - represents static images
      case MediaType.Gif:
        return '#FF9800'; // Orange - represents animation/movement
      case MediaType.Video:
        return '#F44336'; // Red - represents video/playback
      case MediaType.Audio:
        return '#4CAF50'; // Green - represents audio/sound
      case MediaType.Icon:
        return '#9C27B0'; // Purple - represents icons/symbols
      default:
        return '#2196F3'; // Default to blue for images
    }
  };

  const getActionTypeFriendlyName = (actionType: NotificationActionType): string => {
    try {
      return t(`notificationActions.actionTypes.${actionType}` as any);
    } catch {
      // Fallback to action type string if translation not found
      return actionType.toString();
    }
  };

  const getDeliveryTypeFriendlyName = (deliveryType: NotificationDeliveryType): string => {
    try {
      return t(`notificationDetail.deliveryTypes.${deliveryType}` as any);
    } catch {
      // Fallback to delivery type string if translation not found
      return deliveryType;
    }
  };

  const getMediaTypeFriendlyName = (mediaType: MediaType): string => {
    try {
      return t(`mediaTypes.${mediaType}` as any);
    } catch {
      // Fallback to media type string if translation not found
      return mediaType.toString();
    }
  };

  const getNotificationActions = (notification: NotificationFragment) => {
    const message = notification.message;
    return (
      (message?.actions || []).filter(
        (action) =>
          action &&
          [
            NotificationActionType.BackgroundCall,
            NotificationActionType.Webhook,
            NotificationActionType.Snooze,
            NotificationActionType.Navigate,
          ].includes(action.type)
      ) || []
    );
  }

  return {
    getDeliveryTypeIcon,
    getDeliveryTypeColor,
    getActionTypeIcon,
    getMediaTypeIcon,
    getActionTypeFriendlyName,
    getMediaTypeColor,
    getDeliveryTypeFriendlyName,
    getMediaTypeFriendlyName,
    getNotificationActions,
  };
};
