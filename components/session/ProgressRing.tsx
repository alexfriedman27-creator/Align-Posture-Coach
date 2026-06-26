import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  animatedProgress: Animated.Value;
  size?: number;
  strokeWidth?: number;
  timeLabel: string;
  subLabel?: string;
}

export function ProgressRing({ animatedProgress, size = 160, strokeWidth = 8, timeLabel, subLabel }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.cardElevated}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset as any}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.time}>{timeLabel}</Text>
      {subLabel && <Text style={styles.sub}>{subLabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  time: {
    ...Typography.title,
    fontSize: 36,
    lineHeight: 44,
    color: Colors.primaryText,
  },
  sub: {
    ...Typography.caption,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
});
