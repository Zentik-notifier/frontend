import { AppIcons } from '@/constants/Icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from './ui/Icon';

interface SectionHeaderProps {
  title: string;
  iconName: keyof typeof AppIcons;
}

export function SectionHeader({ title, iconName }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Icon name={iconName} size="md" color="primary" />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
});

export default SectionHeader;
