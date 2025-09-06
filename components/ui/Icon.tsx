import { AppIcons, IconColors, IconConfig, IconSets, IconSizes } from '@/constants/Icons';
import React from 'react';

interface IconProps {
  name: keyof typeof AppIcons;
  size?: keyof typeof IconSizes | number;
  color?: keyof typeof IconColors | string;
  style?: any;
}

interface CustomIconProps {
  config: IconConfig;
  size?: keyof typeof IconSizes | number;
  color?: keyof typeof IconColors | string;
  style?: any;
}

export function Icon({ name, size = 'md', color = 'secondary', style }: IconProps) {
  const iconConfig = AppIcons[name];
  if (!iconConfig) {
    console.warn(`Icon "${name}" not found in AppIcons`);
    return null;
  }
  return <CustomIcon config={iconConfig} size={size} color={color} style={style} />;
}

export function CustomIcon({ config, size = 'md', color = 'secondary', style }: CustomIconProps) {
  if (!config || !config.set || !IconSets[config.set]) {
    console.warn(`Invalid icon config:`, config);
    return null;
  }
  
  const IconComponent = IconSets[config.set];
  
  const iconSize = typeof size === 'number' ? size : IconSizes[size];
  const iconColor = typeof color === 'string' && color.startsWith('#') ? color : IconColors[color as keyof typeof IconColors] || color;
  return (
    <IconComponent
      name={config.name as any}
      size={iconSize}
      color={iconColor}
      style={style}
    />
  );
}

export default Icon;
