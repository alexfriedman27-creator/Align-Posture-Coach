import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput,
  TouchableOpacity, Image, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../lib/design/colors';
import { Typography } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';
import { Button } from '../components/shared/Button';
import { insertCustomExercise } from '../lib/db/queries';
import { CustomExercise } from '../types/CustomExercise';
import { ExerciseSlot, SLOT_NAME, DAILY_SLOTS } from '../types/Exercise';

const DURATION_OPTIONS = [20, 30, 45, 60, 90, 120];
const ALL_SLOTS: ExerciseSlot[] = [...DAILY_SLOTS, 'integration'];

export default function CreateExerciseScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slot, setSlot] = useState<ExerciseSlot>('neck');
  const [duration, setDuration] = useState(30);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this exercise.');
      return;
    }
    setSaving(true);
    try {
      const ex: CustomExercise = {
        id: `custom_${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        photoUri,
        slot,
        durationSeconds: duration,
        createdAt: new Date().toISOString(),
      };
      await insertCustomExercise(ex);
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save exercise.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={Colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Exercise</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Photo */}
        <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color={Colors.tertiaryText} />
              <Text style={styles.photoHint}>Add photo (optional)</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>EXERCISE NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Wall Pec Stretch"
            placeholderTextColor={Colors.tertiaryText}
            value={name}
            onChangeText={setName}
            maxLength={60}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="What does this exercise target? How do you do it?"
            placeholderTextColor={Colors.tertiaryText}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Slot */}
        <View style={styles.field}>
          <Text style={styles.label}>BODY AREA</Text>
          <View style={styles.chipRow}>
            {ALL_SLOTS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, slot === s && styles.chipActive]}
                onPress={() => setSlot(s)}
              >
                <Text style={[styles.chipText, slot === s && styles.chipTextActive]}>
                  {SLOT_NAME[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.field}>
          <Text style={styles.label}>DURATION</Text>
          <View style={styles.chipRow}>
            {DURATION_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, duration === d && styles.chipActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.chipText, duration === d && styles.chipTextActive]}>
                  {d}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          label="Save Exercise"
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: Spacing.section }}
        />
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
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.icon,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...Typography.subheadline },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.card, paddingBottom: 60, gap: Spacing.inner },
  photoPicker: {
    height: 160,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardElevated,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoHint: { ...Typography.caption, color: Colors.tertiaryText, marginTop: Spacing.tight },
  field: { gap: Spacing.tight },
  label: { ...Typography.label, color: Colors.tertiaryText, letterSpacing: 0.8 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 14,
    ...Typography.body,
    color: Colors.primaryText,
  },
  inputMultiline: { minHeight: 100, paddingTop: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.tight },
  chip: {
    backgroundColor: Colors.card,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.cardElevated,
  },
  chipActive: {
    backgroundColor: Colors.accent + '22',
    borderColor: Colors.accent,
  },
  chipText: { ...Typography.label, color: Colors.secondaryText },
  chipTextActive: { color: Colors.accent },
});
