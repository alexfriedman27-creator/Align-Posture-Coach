import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, PanResponder, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/design/colors';
import { Typography, FontFamily } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';
import { exerciseRepository } from '../lib/data/ExerciseRepository';
import { Exercise, ExerciseSlot, SLOT_NAME } from '../types/Exercise';
import { CustomExercise } from '../types/CustomExercise';
import { CustomProgram } from '../types/CustomProgram';
import {
  getCustomExercises, getCustomProgram,
  insertCustomProgram, updateCustomProgram,
} from '../lib/db/queries';
import { customToExercise } from '../lib/utils/resolveExercises';

const ALL_SLOTS: ExerciseSlot[] = ['neck', 'shoulder_scapula', 'thoracic_spine', 'core_pelvis', 'hip', 'integration'];

function isCustomId(id: string) { return id.startsWith('custom_'); }

// ── Draggable selected list ───────────────────────────────────────────────────

const ITEM_H_FALLBACK = 56;

interface DraggableListProps {
  exercises: Exercise[];
  onReorder: (newIds: string[]) => void;
  onRemove: (id: string) => void;
}

function DraggableExerciseList({ exercises, onReorder, onRemove }: DraggableListProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const animY = useRef(new Animated.Value(0)).current;
  const itemHeights = useRef<number[]>([]);

  function itemOffset(idx: number): number {
    let off = 0;
    for (let i = 0; i < idx; i++) off += itemHeights.current[i] ?? ITEM_H_FALLBACK;
    return off;
  }

  function computeTarget(fromIdx: number, dy: number): number {
    const fromH = itemHeights.current[fromIdx] ?? ITEM_H_FALLBACK;
    const center = itemOffset(fromIdx) + fromH / 2 + dy;
    let cum = 0;
    for (let i = 0; i < exercises.length; i++) {
      cum += itemHeights.current[i] ?? ITEM_H_FALLBACK;
      if (center < cum) return i;
    }
    return exercises.length - 1;
  }

  // Pan responders are created per render; RN's gesture system holds the active
  // responder through the gesture even if props change mid-drag.
  function makePan(index: number) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        animY.setValue(0);
        setDraggingIndex(index);
        setTargetIndex(index);
      },
      onPanResponderMove: (_, g) => {
        animY.setValue(g.dy);
        setTargetIndex(computeTarget(index, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        const to = computeTarget(index, g.dy);
        if (to !== index) {
          const ids = exercises.map((e) => e.id);
          const [pulled] = ids.splice(index, 1);
          ids.splice(to, 0, pulled);
          onReorder(ids);
        }
        setDraggingIndex(null);
        setTargetIndex(null);
        Animated.timing(animY, { toValue: 0, duration: 80, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        setDraggingIndex(null);
        setTargetIndex(null);
        animY.setValue(0);
      },
    });
  }

  return (
    <View style={styles.exerciseList}>
      {exercises.map((ex, i) => {
        const isDragging = draggingIndex === i;
        const isAboveTarget = targetIndex === i && draggingIndex !== null && draggingIndex > i;
        const isBelowTarget = targetIndex === i && draggingIndex !== null && draggingIndex < i;

        return (
          <View key={ex.id}>
            {isAboveTarget && <View style={styles.dropLine} />}
            <Animated.View
              onLayout={(e) => { itemHeights.current[i] = e.nativeEvent.layout.height; }}
              style={[
                styles.exerciseRow,
                i < exercises.length - 1 && styles.exerciseRowBorder,
                isDragging && styles.exerciseRowDragging,
                isDragging && { transform: [{ translateY: animY }] },
              ]}
            >
              <View {...makePan(i).panHandlers} style={styles.dragHandle} hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}>
                <Ionicons name="reorder-three" size={22} color={Colors.tertiaryText} />
              </View>
              {isCustomId(ex.id) && (
                <View style={styles.customTag}>
                  <Text style={styles.customTagText} allowFontScaling={false}>custom</Text>
                </View>
              )}
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.exerciseMeta}>{SLOT_NAME[ex.slot]} · {ex.duration_seconds}s</Text>
              </View>
              <TouchableOpacity onPress={() => onRemove(ex.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={22} color={Colors.tertiaryText} />
              </TouchableOpacity>
            </Animated.View>
            {isBelowTarget && <View style={styles.dropLine} />}
          </View>
        );
      })}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CreateProgramScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!editId;

  const [programName, setProgramName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [slotFilter, setSlotFilter] = useState<ExerciseSlot | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCustomExercises().then(setCustomExercises);
    if (editId) {
      getCustomProgram(editId).then((prog) => {
        if (prog) {
          setProgramName(prog.name);
          setSelectedIds(prog.exerciseIds);
        }
      });
    }
  }, [editId]);

  const allCustomAsExercises = customExercises.map(customToExercise);
  const allExercises: Exercise[] = [...exerciseRepository.allExercises, ...allCustomAsExercises];

  const selectedExercises = selectedIds
    .map((id) => allExercises.find((e) => e.id === id))
    .filter((e): e is Exercise => e != null);

  const available = allExercises.filter(
    (ex) => !selectedIds.includes(ex.id) && (slotFilter === null || ex.slot === slotFilter)
  );

  function addExercise(ex: Exercise) {
    setSelectedIds((prev) => [...prev, ex.id]);
  }

  function removeExercise(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  async function handleSave() {
    const name = programName.trim();
    if (!name) { Alert.alert('Name required', 'Give your program a name before saving.'); return; }
    if (selectedIds.length === 0) { Alert.alert('No exercises', 'Add at least one exercise to your program.'); return; }

    setSaving(true);
    try {
      const id = editId || `custprog_${Date.now()}`;
      const program: CustomProgram = { id, name, exerciseIds: selectedIds, createdAt: new Date().toISOString() };

      if (isEditing) {
        await updateCustomProgram(program);
        router.back();
      } else {
        await insertCustomProgram(program);
        router.replace({ pathname: '/custom-program-detail', params: { programId: id } });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={Colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Program' : 'New Program'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.saveBtn, saving && { opacity: 0.4 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Name input */}
        <View style={styles.nameCard}>
          <Text style={styles.fieldLabel}>PROGRAM NAME</Text>
          <TextInput
            style={styles.nameInput}
            value={programName}
            onChangeText={setProgramName}
            placeholder="e.g. Morning Mobility"
            placeholderTextColor={Colors.tertiaryText}
            maxLength={50}
            returnKeyType="done"
          />
        </View>

        {/* Selected exercises */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Your Program{selectedExercises.length > 0 ? ` · ${selectedExercises.length} exercise${selectedExercises.length !== 1 ? 's' : ''}` : ''}
          </Text>

          {selectedExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="add-circle-outline" size={28} color={Colors.tertiaryText} />
              <Text style={styles.emptyText}>Tap exercises below to add them.</Text>
            </View>
          ) : (
            <DraggableExerciseList
              exercises={selectedExercises}
              onReorder={setSelectedIds}
              onRemove={removeExercise}
            />
          )}
        </View>

        {/* Add exercises */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Exercises</Text>

          {/* Slot filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[styles.filterChip, slotFilter === null && styles.filterChipActive]}
                onPress={() => setSlotFilter(null)}
              >
                <Text style={[styles.filterChipText, slotFilter === null && styles.filterChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {ALL_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.filterChip, slotFilter === slot && styles.filterChipActive]}
                  onPress={() => setSlotFilter(slotFilter === slot ? null : slot)}
                >
                  <Text style={[styles.filterChipText, slotFilter === slot && styles.filterChipTextActive]}>
                    {SLOT_NAME[slot]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Available exercise list */}
          {available.length === 0 ? (
            <Text style={styles.noneText}>All exercises in this area are already added.</Text>
          ) : (
            <View style={styles.exerciseList}>
              {available.map((ex, i) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.exerciseRow, i < available.length - 1 && styles.exerciseRowBorder]}
                  onPress={() => addExercise(ex)}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseLeft}>
                    {isCustomId(ex.id) && (
                      <View style={styles.customTag}>
                        <Text style={styles.customTagText} allowFontScaling={false}>custom</Text>
                      </View>
                    )}
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Text style={styles.exerciseMeta}>{SLOT_NAME[ex.slot]} · {ex.duration_seconds}s</Text>
                    </View>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={Colors.accent} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.card,
    paddingVertical: Spacing.inner,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardElevated,
  },
  headerTitle: { ...Typography.headline },
  saveBtn: { fontFamily: FontFamily.poppinsBold, fontSize: 17, lineHeight: 22, color: Colors.accent },
  scroll: { flex: 1 },
  content: { padding: Spacing.card, gap: Spacing.gap, paddingBottom: 40 },

  nameCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    gap: Spacing.tight,
  },
  fieldLabel: { ...Typography.caption, fontSize: 11, lineHeight: 16, color: Colors.tertiaryText, letterSpacing: 0.8 },
  nameInput: {
    ...Typography.bodyMedium,
    color: Colors.primaryText,
    paddingVertical: 4,
  },

  section: { gap: Spacing.tight },
  sectionTitle: { ...Typography.subheadline },

  emptyState: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.gap,
    alignItems: 'center',
    gap: Spacing.tight,
  },
  emptyText: { ...Typography.body, fontSize: 15, lineHeight: 22, color: Colors.secondaryText, textAlign: 'center' },

  exerciseList: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.inner,
    paddingVertical: 12,
    backgroundColor: Colors.card,
  },
  exerciseRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardElevated,
  },
  exerciseRowDragging: {
    backgroundColor: Colors.cardElevated,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    zIndex: 100,
  },
  dragHandle: {
    paddingRight: Spacing.tight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropLine: {
    height: 2,
    backgroundColor: Colors.accent,
    marginHorizontal: Spacing.inner,
    borderRadius: 1,
  },
  exerciseLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.tight, flex: 1, marginRight: Spacing.tight },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...Typography.bodyMedium },
  exerciseMeta: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText, marginTop: 1 },

  customTag: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radii.chip,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  customTagText: { fontFamily: FontFamily.poppinsBold, fontSize: 10, lineHeight: 14, color: Colors.secondaryText, letterSpacing: 0.4 },

  filterScroll: { paddingBottom: 2 },
  filterChip: {
    backgroundColor: Colors.card,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 7,
    marginRight: Spacing.tight,
    borderWidth: 1,
    borderColor: Colors.cardElevated,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterChipText: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText },
  filterChipTextActive: { color: Colors.white, fontFamily: FontFamily.poppinsBold },

  noneText: { ...Typography.body, fontSize: 15, lineHeight: 22, color: Colors.tertiaryText, textAlign: 'center', paddingVertical: Spacing.inner },
});
