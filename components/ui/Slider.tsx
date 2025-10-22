import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import CommunitySlider from '@react-native-community/slider';

export type PaperSliderProps = {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  showValueLabel?: boolean;
  valueFormatter?: (value: number) => string;
};

export default function Slider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step,
  disabled,
  style,
  showValueLabel = false,
  valueFormatter,
}: PaperSliderProps) {
  const theme = useTheme();

  return (
    <View style={style as any}>
      {showValueLabel && (
        <Text variant="bodySmall" style={{ textAlign: 'center', marginBottom: 6 }}>
          {valueFormatter ? valueFormatter(value) : String(value)}
        </Text>
      )}
      <CommunitySlider
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        minimumTrackTintColor={theme.colors.primary}
        maximumTrackTintColor={theme.colors.outline}
        thumbTintColor={theme.colors.primary}
      />
    </View>
  );
}


