import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge, BadgeCategory,
  BADGE_CATEGORY_ORDER, BADGE_DEFINITIONS, CATEGORY_COLORS, CATEGORY_LABELS,
  getBadgeDefinition,
} from '../../types/Badge';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { Radii } from '../../lib/design/radii';

interface Props {
  visible: boolean;
  badges: Badge[];
  pinnedId: string | null;
  onPin: (badgeId: string) => void;
  onClose: () => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ICON_MAP: Record<string, IoniconsName> = {
  'flame': 'flame', 'diamond': 'diamond', 'trophy': 'trophy', 'ribbon': 'ribbon',
  'medal': 'medal', 'star': 'star', 'calendar': 'calendar', 'calendar-outline': 'calendar-outline',
  'timer': 'timer', 'time': 'time', 'compass': 'compass', 'flask': 'flask',
  'checkmark-done': 'checkmark-done', 'checkmark-done-circle': 'checkmark-done-circle',
  'library': 'library', 'layers': 'layers', 'rocket': 'rocket', 'sparkles': 'sparkles',
  'pencil': 'pencil', 'hammer': 'hammer', 'camera': 'camera', 'images': 'images',
  'sunny': 'sunny', 'moon': 'moon', 'refresh': 'refresh', 'hourglass': 'hourglass',
  'play-circle': 'play-circle',
  'shield-checkmark': 'shield-checkmark', 'infinite': 'infinite', 'barbell': 'barbell',
  'trending-up': 'trending-up', 'create': 'create', 'construct': 'construct',
  'bookmarks': 'bookmarks', 'flash': 'flash', 'book': 'book',
};

function badgeIconName(iconName: string): IoniconsName {
  return ICON_MAP[iconName] ?? 'ribbon';
}

function badgeCategoryColor(badge: Badge): string {
  const def = getBadgeDefinition(badge.id);
  if (!def) return CATEGORY_COLORS.special;
  return def.color ?? CATEGORY_COLORS[def.category];
}

const DEFINITION_ORDER = BADGE_DEFINITIONS.reduce<Record<string, number>>((acc, d, i) => {
  acc[d.id] = i;
  return acc;
}, {});

export function BadgePicker({ visible, badges, pinnedId, onPin, onClose }: Props) {
  const grouped = BADGE_CATEGORY_ORDER.reduce<Record<BadgeCategory, Badge[]>>((acc, cat) => {
    acc[cat] = badges
      .filter((b) => getBadgeDefinition(b.id)?.category === cat)
      .sort((a, b) => (DEFINITION_ORDER[a.id] ?? 999) - (DEFINITION_ORDER[b.id] ?? 999));
    return acc;
  }, {} as Record<BadgeCategory, Badge[]>);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Choose badge</Text>
        <Text style={styles.sub}>Tap a badge to pin it to your profile</Text>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {BADGE_CATEGORY_ORDER.map((cat) => {
            const catBadges = grouped[cat];
            if (catBadges.length === 0) return null;
            const accentColor = CATEGORY_COLORS[cat];
            return (
              <View key={cat}>
                <Text style={[styles.categoryHeader, { color: accentColor }]}>{CATEGORY_LABELS[cat]}</Text>
                {catBadges.map((badge) => {
                  const isPinned = badge.id === pinnedId;
                  const color = badgeCategoryColor(badge);
                  return (
                    <TouchableOpacity
                      key={badge.id}
                      style={[styles.row, { borderColor: isPinned ? color : color + '44' }]}
                      onPress={() => { onPin(badge.id); onClose(); }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: isPinned ? color : color + '22' }]}>
                        <Ionicons name={badgeIconName(badge.iconName)} size={18} color={isPinned ? Colors.white : color} />
                        {(getBadgeDefinition(badge.id)?.stars ?? 0) > 0 && (
                          <View style={{ flexDirection: 'row', gap: 2 }}>
                            {Array.from({ length: getBadgeDefinition(badge.id)!.stars! }, (_, i) => (
                              <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isPinned ? Colors.white : color }} />
                            ))}
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.badgeName}>{badge.name}</Text>
                        <Text style={styles.badgeDesc}>{badge.description}</Text>
                      </View>
                      {isPinned && <Ionicons name="checkmark" size={18} color={color} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radii.hero,
    borderTopRightRadius: Radii.hero,
    paddingTop: Spacing.tight,
    paddingHorizontal: Spacing.card,
    paddingBottom: Spacing.section,
    maxHeight: '75%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.cardElevated, alignSelf: 'center', marginBottom: Spacing.inner },
  title: { ...Typography.headline },
  sub: { ...Typography.body, color: Colors.secondaryText, marginTop: 4, marginBottom: Spacing.inner },
  list: { gap: Spacing.tight, paddingBottom: Spacing.inner },
  categoryHeader: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.inner,
    marginBottom: Spacing.micro,
    marginLeft: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.inner,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeName: { ...Typography.bodyMedium },
  badgeDesc: { ...Typography.caption, color: Colors.secondaryText, marginTop: 2 },
});
