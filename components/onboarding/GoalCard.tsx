import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserGoal, GOAL_DISPLAY } from '../../types/UserProfile';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Radii } from '../../lib/design/radii';
import { Spacing } from '../../lib/design/spacing';

const GOAL_ICONS: Record<UserGoal, React.ComponentProps<typeof Ionicons>['name']> = {
  fixPosture: 'arrow-up',
  reducePain: 'diamond-outline',
  moveAndFeel: 'refresh-outline',
  lookConfident: 'star-outline',
};

const GOAL_ICONS_FILLED: Record<UserGoal, React.ComponentProps<typeof Ionicons>['name']> = {
  fixPosture: 'arrow-up',
  reducePain: 'diamond',
  moveAndFeel: 'refresh',
  lookConfident: 'star',
};

interface Props {
  goal: UserGoal;
  selected: boolean;
  onPress: () => void;
}

export function GoalCard({ goal, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        <Ionicons
          name={selected ? GOAL_ICONS_FILLED[goal] : GOAL_ICONS[goal]}
          size={20}
          color={selected ? Colors.white : Colors.secondaryText}
        />
      </View>
      <Text style={[styles.label, selected && styles.labelSelected]}>{GOAL_DISPLAY[goal]}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    paddingVertical: Spacing.inner,
    paddingHorizontal: Spacing.inner,
    gap: Spacing.inner,
    borderWidth: 1.5,
    borderColor: Colors.cardElevated,
  },
  selected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.chip,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: Colors.accent,
  },
  label: {
    ...Typography.subheadline,
    color: Colors.secondaryText,
    flex: 1,
  },
  labelSelected: {
    color: Colors.primaryText,
  },
});
