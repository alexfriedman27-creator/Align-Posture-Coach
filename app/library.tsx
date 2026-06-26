import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/design/colors';
import { Typography } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';
import { exerciseRepository } from '../lib/data/ExerciseRepository';
import { getCustomExercises } from '../lib/db/queries';
import { CustomExercise } from '../types/CustomExercise';
import { Exercise, ExerciseSlot, ExerciseCategory, SLOT_NAME, SLOT_BADGE, DAILY_SLOTS } from '../types/Exercise';
import { useUserStore } from '../lib/store/useUserStore';

type SlotFilter = ExerciseSlot | null;
type CategoryFilter = ExerciseCategory | null;

const SLOT_FILTERS: { label: string; value: ExerciseSlot }[] = [
  ...DAILY_SLOTS.map((s) => ({ label: SLOT_NAME[s], value: s })),
  { label: 'Integration', value: 'integration' as ExerciseSlot },
];

const CATEGORY_FILTERS: { label: string; value: ExerciseCategory }[] = [
  { label: 'Stretch',    value: 'stretch'    },
  { label: 'Strengthen', value: 'strengthen' },
  { label: 'Mobility',   value: 'mobility'   },
  { label: 'Awareness',  value: 'awareness'  },
];

const CATEGORY_COLOR: Record<ExerciseCategory, string> = {
  stretch: '#4EA8FF',
  strengthen: '#FF7A33',
  mobility: '#4EC97B',
  awareness: '#B57BFF',
};

type DisplayExercise =
  | { kind: 'builtin'; data: Exercise }
  | { kind: 'custom'; data: CustomExercise };

function SlotBadge({ slot }: { slot: ExerciseSlot }) {
  return (
    <View style={styles.badge}>
      <View style={styles.badgeStripes} />
      <Text style={styles.badgeText}>{SLOT_BADGE[slot]}</Text>
    </View>
  );
}

function ExerciseRow({ item, onPress }: { item: DisplayExercise; onPress: () => void }) {
  const isCustom = item.kind === 'custom';
  const name = item.data.name;
  const slot = item.data.slot;
  const duration = isCustom ? (item.data as CustomExercise).durationSeconds : (item.data as Exercise).duration_seconds;
  const category = isCustom ? null : (item.data as Exercise).category;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <SlotBadge slot={slot} />
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, isCustom && { color: Colors.accent }]}>{name}</Text>
        <View style={styles.rowMeta}>
          {category && (
            <>
              <Text style={[styles.rowCategory, { color: CATEGORY_COLOR[category] }]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
              <Text style={styles.rowDot}> · </Text>
            </>
          )}
          <Text style={styles.rowMetaText}>{SLOT_NAME[slot]}</Text>
          <Text style={styles.rowDot}> · </Text>
          <Text style={styles.rowMetaText}>{duration}s hold</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.tertiaryText} />
    </TouchableOpacity>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const { profile } = useUserStore();
  const [search, setSearch] = useState('');
  const [slotFilter, setSlotFilter] = useState<SlotFilter>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(null);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);

  useFocusEffect(useCallback(() => {
    getCustomExercises().then(setCustomExercises);
  }, []));

  const allBuiltin: DisplayExercise[] = exerciseRepository.allExercises.map((e) => ({ kind: 'builtin', data: e }));
  const allCustom: DisplayExercise[] = customExercises.map((e) => ({ kind: 'custom', data: e }));
  const all: DisplayExercise[] = [...allBuiltin, ...allCustom];

  const filtered = all.filter((item) => {
    const name = item.data.name.toLowerCase();
    const slot = item.data.slot;
    const category = item.kind === 'builtin' ? (item.data as Exercise).category : null;

    if (search && !name.includes(search.toLowerCase())) return false;
    if (slotFilter !== null && slot !== slotFilter) return false;
    if (categoryFilter !== null && category !== categoryFilter) return false;
    return true;
  });

  const total = all.length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.primaryText} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>{total} exercises & stretches</Text>
        </View>
        {profile?.isPro && (
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/create-exercise')}>
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.tertiaryText} style={{ marginRight: Spacing.tight }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises"
          placeholderTextColor={Colors.tertiaryText}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.tertiaryText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>AREA</Text>
          <View style={styles.filterRow}>
            {SLOT_FILTERS.map((f) => {
              const active = slotFilter === f.value;
              return (
                <TouchableOpacity
                  key={f.value}
                  style={[styles.filterChip, active && styles.filterChipActiveSlot]}
                  onPress={() => setSlotFilter(active ? null : f.value)}
                >
                  <Text
                    style={[styles.filterChipText, active && styles.filterChipTextActive]}
                    allowFontScaling={false}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>TYPE</Text>
          <View style={styles.filterRow}>
            {CATEGORY_FILTERS.map((f) => {
              const active = categoryFilter === f.value;
              const color  = CATEGORY_COLOR[f.value];
              return (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => setCategoryFilter(active ? null : f.value)}
                >
                  <Text
                    style={[styles.filterChipText, active && styles.filterChipTextActive]}
                    allowFontScaling={false}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.data.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ExerciseRow
            item={item}
            onPress={() => router.push({
              pathname: '/exercise-detail',
              params: { id: item.data.id, kind: item.kind },
            })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={36} color={Colors.tertiaryText} />
            <Text style={[Typography.body, { color: Colors.secondaryText, marginTop: Spacing.tight }]}>
              No exercises match
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.inner,
    paddingHorizontal: Spacing.card,
    paddingTop: Spacing.tight,
    paddingBottom: Spacing.inner,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.icon,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.headline },
  subtitle: { ...Typography.caption, color: Colors.secondaryText, marginTop: 1 },
  addBtn: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: Radii.icon,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.button,
    marginHorizontal: Spacing.card,
    marginBottom: Spacing.tight,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.primaryText,
    padding: 0,
  },
  filterSection: {
    paddingHorizontal: Spacing.card,
    paddingBottom: Spacing.tight,
    gap: 10,
  },
  filterGroup: {
    gap: 6,
  },
  filterGroupLabel: {
    ...Typography.caption,
    color: Colors.tertiaryText,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.tight,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardElevated,
  },
  filterChipActiveSlot: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterChipText: { ...Typography.label, color: Colors.secondaryText },
  filterChipTextActive: { color: Colors.white },
  list: { paddingBottom: 40 },
  separator: { height: 1, backgroundColor: Colors.cardElevated, marginLeft: 72 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.card,
    paddingVertical: 14,
    gap: Spacing.inner,
    backgroundColor: Colors.background,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: Radii.icon,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeStripes: {
    ...StyleSheet.absoluteFill,
    opacity: 0.12,
    backgroundColor: Colors.cardElevated,
  },
  badgeText: { ...Typography.label, color: Colors.secondaryText, letterSpacing: 0.5 },
  rowContent: { flex: 1 },
  rowName: { ...Typography.bodyMedium, color: Colors.primaryText },
  rowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  rowCategory: { ...Typography.caption, fontFamily: 'Outfit-Bold' },
  rowDot: { ...Typography.caption, color: Colors.tertiaryText },
  rowMetaText: { ...Typography.caption, color: Colors.secondaryText },
  empty: { alignItems: 'center', paddingTop: 60 },
});
