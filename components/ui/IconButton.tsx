import { AppIcons } from '@/constants/Icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from './Icon';

interface IconButtonProps {
  title: string;
  iconName: keyof typeof AppIcons;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton({ 
  title, 
  iconName, 
  onPress, 
  disabled = false, 
  loading = false, 
  loadingText = 'Loading...', 
  variant = 'primary',
  size = 'md'
}: IconButtonProps) {
  const isDisabled = disabled || loading;
  
  const buttonStyles = [
    styles.button,
    styles[size],
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'success' && styles.success,
    variant === 'danger' && styles.danger,
    isDisabled && styles.disabled
  ].filter(Boolean);

  const textStyles = [
    styles.text,
    variant === 'primary' && styles.primaryText,
    variant === 'secondary' && styles.secondaryText,
    variant === 'success' && styles.successText,
    variant === 'danger' && styles.dangerText,
    isDisabled && styles.disabledText
  ].filter(Boolean);

  const getIconColor = () => {
    if (isDisabled) return 'gray';
    if (variant === 'primary' || variant === 'success' || variant === 'danger') return 'white';
    return 'primary';
  };

  const iconSize = size === 'lg' ? 'lg' : 'sm';

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
    >
      <View style={styles.content}>
        <Icon 
          name={loading ? 'loading' : iconName} 
          size={iconSize} 
          color={getIconColor()}
        />
        <Text style={textStyles}>
          {loading ? loadingText : title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '600',
  },
  
  // Variants
  primary: {
    backgroundColor: '#0a7ea4',
  },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  success: {
    backgroundColor: '#4CAF50',
  },
  danger: {
    backgroundColor: '#f44336',
  },
  
  // Text colors
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: '#333',
  },
  successText: {
    color: '#fff',
  },
  dangerText: {
    color: '#fff',
  },
  
  // Sizes
  sm: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  md: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  lg: {
    paddingVertical: 18,
    paddingHorizontal: 25,
  },
  
  // States
  disabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  disabledText: {
    color: '#999',
  },
});

export default IconButton;
