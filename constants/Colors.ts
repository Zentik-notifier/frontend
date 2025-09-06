/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * Extended color system for comprehensive theming support.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#4da6d9';

export const Colors = {
  light: {
    // Base colors
    text: '#11181C',
    textSecondary: '#666',
    textMuted: '#999',
    background: '#fff',
    backgroundSecondary: '#f5f5f5',
    backgroundCard: '#f8f9fa',
    
    // Interactive colors
    tint: tintColorLight,
    primary: tintColorLight,
    secondary: '#666',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#f44336',
    
    // UI elements
    border: '#ddd',
    borderLight: '#e0e0e0',
    shadow: '#000',
    
    // Icons
    icon: '#687076',
    iconSecondary: '#999',
    iconDisabled: '#ccc',
    
    // Tabs
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    
    // Form elements
    inputBackground: '#fff',
    inputBorder: '#ddd',
    inputPlaceholder: '#999',
    
    // Buttons
    buttonPrimary: tintColorLight,
    buttonSecondary: '#fff',
    buttonSuccess: '#4CAF50',
    buttonWarning: '#FF9800',
    buttonError: '#f44336',
    buttonDisabled: '#ccc',
    
    // States
    selected: '#f0f8ff',
    hover: '#f8f8f8',
    disabled: '#f5f5f5',
    
    // Notifications
    notificationBackground: '#fff',
    notificationBorder: '#e0e0e0',
  },
  dark: {
    // Base colors
    text: '#ECEDEE',
    textSecondary: '#B0B3B8',
    textMuted: '#8A8D93',
    background: '#151718',
    backgroundSecondary: '#1C1E21',
    backgroundCard: '#242526',
    
    // Interactive colors
    tint: tintColorDark,
    primary: tintColorDark,
    secondary: '#B0B3B8',
    success: '#5CBF60',
    warning: '#FFB74D',
    error: '#EF5350',
    
    // UI elements
    border: '#3A3B3C',
    borderLight: '#4E4F50',
    shadow: '#000',
    
    // Icons
    icon: '#9BA1A6',
    iconSecondary: '#8A8D93',
    iconDisabled: '#5A5D61',
    
    // Tabs
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    
    // Form elements
    inputBackground: '#242526',
    inputBorder: '#3A3B3C',
    inputPlaceholder: '#8A8D93',
    
    // Buttons
    buttonPrimary: tintColorDark,
    buttonSecondary: '#242526',
    buttonSuccess: '#5CBF60',
    buttonWarning: '#FFB74D',
    buttonError: '#EF5350',
    buttonDisabled: '#5A5D61',
    
    // States
    selected: '#2C4A64',
    hover: '#3A3B3C',
    disabled: '#1C1E21',
    
    // Notifications
    notificationBackground: '#242526',
    notificationBorder: '#3A3B3C',
  },
};
