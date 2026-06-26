import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../lib/design/colors';
import { Typography, FontFamily } from '../../lib/design/fonts';
import { Radii } from '../../lib/design/radii';
import { Spacing } from '../../lib/design/spacing';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

interface ColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function Column({ items, selectedIndex, onSelect }: ColumnProps) {
  const atMin = selectedIndex === 0;
  const atMax = selectedIndex === items.length - 1;
  return (
    <View style={styles.column}>
      <TouchableOpacity
        onPress={() => onSelect(selectedIndex - 1)}
        disabled={atMin}
        style={styles.arrow}
      >
        <Ionicons name="chevron-up" size={22} color={atMin ? Colors.cardElevated : Colors.secondaryText} />
      </TouchableOpacity>
      <View style={styles.valueBox}>
        <Text style={styles.value}>{items[selectedIndex]}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onSelect(selectedIndex + 1)}
        disabled={atMax}
        style={styles.arrow}
      >
        <Ionicons name="chevron-down" size={22} color={atMax ? Colors.cardElevated : Colors.secondaryText} />
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  hour: number;
  minute: number;
  isPM: boolean;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  onPMChange: (pm: boolean) => void;
}

export function DrumrollPicker({ hour, minute, isPM, onHourChange, onMinuteChange, onPMChange }: Props) {
  const hourIndex = Math.max(0, hour - 1);
  const minuteIndex = Math.round(minute / 5);

  return (
    <View style={styles.container}>
      <Column items={HOURS} selectedIndex={hourIndex} onSelect={(i) => onHourChange(i + 1)} />
      <Text style={styles.colon}>:</Text>
      <Column items={MINUTES} selectedIndex={minuteIndex} onSelect={(i) => onMinuteChange(i * 5)} />
      <View style={styles.ampm}>
        <TouchableOpacity
          style={[styles.ampmBtn, !isPM && styles.ampmBtnActive]}
          onPress={() => onPMChange(false)}
        >
          <Text style={[styles.ampmText, !isPM && styles.ampmTextActive]}>AM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ampmBtn, isPM && styles.ampmBtnActive]}
          onPress={() => onPMChange(true)}
        >
          <Text style={[styles.ampmText, isPM && styles.ampmTextActive]}>PM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.tight,
  },
  column: {
    alignItems: 'center',
    gap: Spacing.micro,
  },
  arrow: {
    padding: Spacing.micro,
  },
  valueBox: {
    width: 88,
    height: 72,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  value: {
    ...Typography.display,
    color: Colors.primaryText,
    fontFamily: FontFamily.poppinsExtraBold,
  },
  colon: {
    ...Typography.display,
    color: Colors.primaryText,
    marginBottom: 2,
  },
  ampm: {
    gap: Spacing.tight,
    marginLeft: Spacing.tight,
  },
  ampmBtn: {
    width: 64,
    height: 32,
    borderRadius: Radii.chip,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmBtnActive: {
    backgroundColor: Colors.accent,
  },
  ampmText: {
    ...Typography.label,
    color: Colors.secondaryText,
  },
  ampmTextActive: {
    color: Colors.white,
  },
});
