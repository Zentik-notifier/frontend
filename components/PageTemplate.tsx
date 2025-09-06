import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { ThemedView } from './ThemedView';

interface PageTemplateProps {
  title?: string;
  headerShown?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function PageTemplate({ 
  title, 
  headerShown = true, 
  children, 
  style,
  padding = 16
}: PageTemplateProps) {
  return (
    <>
      {title && (
        <Stack.Screen 
          options={{ 
            title,
            headerShown,
          }} 
        />
      )}
      <ThemedView style={[
        styles.container, 
        { padding },
        style
      ]}>
        {children}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
