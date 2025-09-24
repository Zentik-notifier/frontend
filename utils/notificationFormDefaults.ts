import { HttpMethod, MediaType, NotificationActionType, NotificationDeliveryType } from '@/generated/gql-operations-generated';

/**
 * Empty form values - used for initial state and reset
 * Form starts completely empty
 */
export const notificationFormDefaults = {
  // Basic fields - all empty
  title: '',
  subtitle: '',
  body: '',
  sound: '',
  deliveryType: NotificationDeliveryType.Normal,
  bucketId: '',
  webhookId: '',
  httpMethod: HttpMethod.Post,

  // Actions and attachments - empty arrays
  actions: [] as any[],
  attachments: [] as any[],

  // Automatic actions flags - all disabled
  addMarkAsReadAction: false,
  addDeleteAction: false,
  addOpenNotificationAction: false,

  // Snooze times - empty
  snoozeTimes: [] as number[],

  // Localization
  locale: 'en-EN' as const,

  // UI state
  snoozeTimeInput: '',
  showJsonPreview: false,

  // Tap action defaults - null (optional)
  tapAction: null
};

/**
 * Reset function that returns all default values
 * Can be used to reset form state
 */
export function getNotificationFormDefaults() {
  return { ...notificationFormDefaults };
}

/**
 * Complete test data with all examples
 * Used when user clicks "Load Test Data" button
 * Note: This is a template - actual values will be filled using i18n translations
 */
export const getNotificationTestData = (t: any) => ({
  // Basic content - using i18n examples
  title: t('notifications.examples.testTitle'),
  subtitle: t('notifications.examples.testSubtitle'),
  body: t('notifications.examples.testBody'),
  sound: 'default',
  deliveryType: NotificationDeliveryType.Normal,

  // Test attachments - variety of media types with i18n names
  attachments: [
    {
      mediaType: MediaType.Image,
      url: 'https://picsum.photos/400/300',
      name: t('notifications.examples.sampleImage')
    },
    {
      mediaType: MediaType.Gif,
      url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
      name: t('notifications.examples.sampleGif')
    },
    {
      mediaType: MediaType.Video,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      name: t('notifications.examples.sampleVideo')
    },
    {
      mediaType: MediaType.Audio,
      url: 'https://file-examples.com/storage/fef6248bef689f7bb9c274f/2017/11/file_example_MP3_1MG.mp3',
      // url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      name: t('notifications.examples.sampleAudio')
    }
  ],

  // Test actions - variety of action types with i18n titles
  actions: [
    {
      type: NotificationActionType.Navigate,
      value: 'https://zentik.com',
      destructive: false,
      icon: 'sfsymbols:house.fill',
      title: t('notifications.examples.visitWebsite')
    },
    {
      type: NotificationActionType.BackgroundCall,
      value: 'POST::https://api.example.com/webhook',
      destructive: false,
      icon: 'sfsymbols:network',
      title: 'Call API'
    },
  ],

  // Automatic actions enabled
  addMarkAsReadAction: true,
  addDeleteAction: false,
  addOpenNotificationAction: false,

  // Snooze times
  snoozeTimes: [5, 15],

  // Enhanced tap action - now optional
  tapAction: {
    type: NotificationActionType.Navigate,
    value: 'https://notifier-docs.zentik.app',
    destructive: false,
    icon: 'sfsymbols:info.circle.fill',
    title: 'Zentik Docs'
  }
});
