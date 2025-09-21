import {
  AntDesign,
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons
} from '@expo/vector-icons';

// Define icon sets for consistent theming
export const IconSets = {
  'SF Symbols': Ionicons,
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
  FontAwesome5,
  AntDesign,
};

// App icon mappings - centralized icon definitions
export const AppIcons: Record<string, { set: keyof typeof IconSets, name: string }> = {
  // Navigation & UI
  home: { set: 'Ionicons', name: 'home-outline' } as const,
  settings: { set: 'Ionicons', name: 'settings-outline' } as const,
  notifications: { set: 'Ionicons', name: 'notifications-outline' } as const,
  notification: { set: 'Ionicons', name: 'notifications-outline' } as const,
  buckets: { set: 'Ionicons', name: 'list-outline' } as const,
  bucket: { set: 'Ionicons', name: 'list-outline' } as const,
  refresh: { set: 'Ionicons', name: 'refresh' } as const,
  app: { set: 'MaterialCommunityIcons', name: 'bell-ring' } as const,
  shield: { set: 'Ionicons', name: 'shield' } as const,

  // Status indicators
  success: { set: 'Ionicons', name: 'checkmark-circle' } as const,
  error: { set: 'Ionicons', name: 'alert-circle' } as const,
  warning: { set: 'Ionicons', name: 'warning' } as const,
  info: { set: 'Ionicons', name: 'information-circle' } as const,

  // Actions
  add: { set: 'Ionicons', name: 'add' } as const,
  remove: { set: 'Ionicons', name: 'remove' } as const,
  edit: { set: 'Ionicons', name: 'pencil' } as const,
  delete: { set: 'Ionicons', name: 'trash-outline' } as const,
  copy: { set: 'Ionicons', name: 'copy-outline' } as const,
  share: { set: 'Ionicons', name: 'share-outline' } as const,
  view: { set: 'Ionicons', name: 'eye-outline' } as const,
  'view-off': { set: 'Ionicons', name: 'eye-off-outline' } as const,
  wrench: { set: 'Ionicons', name: 'construct-outline' } as const,
  camera: { set: 'Ionicons', name: 'camera' } as const,
  close: { set: 'Ionicons', name: 'close' } as const,

  // Push notifications
  push: { set: 'MaterialCommunityIcons', name: 'rocket-launch' } as const,
  rocket: { set: 'Ionicons', name: 'rocket-outline' } as const,
  test: { set: 'MaterialIcons', name: 'science' } as const,
  send: { set: 'Ionicons', name: 'send' } as const,

  // Status & Connection
  connected: { set: 'Ionicons', name: 'wifi' } as const,
  disconnected: { set: 'Ionicons', name: 'wifi-off' } as const,
  loading: { set: 'Ionicons', name: 'reload' } as const,

  // Content types
  text: { set: 'Ionicons', name: 'document-text-outline' } as const,
  image: { set: 'Ionicons', name: 'image-outline' } as const,
  images: { set: 'Ionicons', name: 'images-outline' } as const,
  video: { set: 'Ionicons', name: 'videocam-outline' } as const,
  sound: { set: 'Ionicons', name: 'volume-high-outline' } as const,
  gif: { set: 'MaterialCommunityIcons', name: 'file-gif-box' } as const,
  icon: { set: 'MaterialCommunityIcons', name: 'image-frame' } as const,

  // Priority levels
  priorityLow: { set: 'MaterialIcons', name: 'low-priority' } as const,
  priorityNormal: { set: 'MaterialIcons', name: 'priority-high' } as const,
  priorityHigh: { set: 'MaterialIcons', name: 'priority-high' } as const,

  // Form controls
  dropdown: { set: 'Ionicons', name: 'chevron-down' } as const,
  expand: { set: 'Ionicons', name: 'chevron-up' } as const,
  collapse: { set: 'Ionicons', name: 'chevron-down' } as const,
  chevron: { set: 'Ionicons', name: 'chevron-forward' } as const,
  search: { set: 'Ionicons', name: 'search-outline' } as const,

  // Onboarding & Tutorial
  folder: { set: 'Ionicons', name: 'folder-outline' } as const,
  code: { set: 'Ionicons', name: 'code-outline' } as const,

  // Device & Platform
  mobile: { set: 'Ionicons', name: 'phone-portrait-outline' } as const,
  device: { set: 'Ionicons', name: 'phone-portrait-outline' } as const,
  ios: { set: 'FontAwesome5', name: 'apple' } as const,
  android: { set: 'FontAwesome5', name: 'android' } as const,
  expo: { set: 'MaterialCommunityIcons', name: 'react' } as const,

  // Actions buttons
  reset: { set: 'Ionicons', name: 'refresh-outline' } as const,
  cancel: { set: 'Ionicons', name: 'close' } as const,
  confirm: { set: 'Ionicons', name: 'checkmark' } as const,
  more: { set: 'Ionicons', name: 'ellipsis-horizontal' } as const,

  // Snooze / Muted indicator
  snooze: { set: 'MaterialCommunityIcons', name: 'bell-sleep-outline' } as const,

  // Advanced features
  advanced: { set: 'Ionicons', name: 'construct-outline' } as const,
  basic: { set: 'Ionicons', name: 'layers-outline' } as const,

  // Navigation actions
  navigate: { set: 'Ionicons', name: 'compass-outline' } as const,
  hook: { set: 'MaterialCommunityIcons', name: 'hook' } as const,
  action: { set: 'Ionicons', name: 'play-circle-outline' } as const,

  // User & Auth
  user: { set: 'Ionicons', name: 'person-outline' } as const,
  logout: { set: 'Ionicons', name: 'log-out-outline' } as const,
  login: { set: 'Ionicons', name: 'log-in-outline' } as const,
  password: { set: 'Ionicons', name: 'key-outline' } as const,
  key: { set: 'Ionicons', name: 'key-outline' } as const,

  // OAuth Providers
  github: { set: 'Ionicons', name: 'logo-github' } as const,
  google: { set: 'Ionicons', name: 'logo-google' } as const,
  oauth: { set: 'Ionicons', name: 'globe-outline' } as const,

  // Localization & Language
  language: { set: 'Ionicons', name: 'language-outline' } as const,

  // Data & Storage
  database: { set: 'MaterialCommunityIcons', name: 'database' } as const,
  backup: { set: 'MaterialCommunityIcons', name: 'backup-restore' } as const,

  // Network & API
  api: { set: 'MaterialCommunityIcons', name: 'api' } as const,
  webhook: { set: 'MaterialCommunityIcons', name: 'webhook' } as const,
  notebook: { set: 'MaterialCommunityIcons', name: 'notebook' } as const,

} as const;

// Type for icon configuration
export type IconConfig = {
  set: keyof typeof IconSets;
  name: string;
};

// Type for available icon names
export type IconName = keyof typeof AppIcons;

// Default icon props
export const defaultIconProps = {
  size: 24,
  color: '#333',
} as const;

// Icon sizes
export const IconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 48,
} as const;

// Icon colors
export const IconColors = {
  primary: '#0a7ea4',
  secondary: '#666',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#f44336',
  white: '#fff',
  black: '#000',
  gray: '#999',
  disabled: '#ccc',

  // OAuth Provider colors
  github: '#24292e',
  google: '#4285f4',
} as const;
