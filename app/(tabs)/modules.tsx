import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../lib/design/colors';
import { Typography, FontFamily } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { Radii } from '../../lib/design/radii';
import { moduleRepository } from '../../lib/data/ModuleRepository';
import { PostureModule, ModuleIntensity, INTENSITY_LABEL, MODULE_ICON } from '../../types/Module';

const INTENSITY_COLOR: Record<ModuleIntensity, string> = {
  easy: '#4EC97B',
  moderate: '#4EA8FF',
  hard: '#FF7A33',
};
import { useUserStore } from '../../lib/store/useUserStore';
import { getFavoriteModuleIds, addFavoriteModule, removeFavoriteModule, getCustomPrograms } from '../../lib/db/queries';
import { CustomProgram } from '../../types/CustomProgram';

const CUSTOM_PURPLE = '#B57BFF';

function ModuleCard({
  module, onPress, isPro, isFavorite, onToggleFavorite,
}: {
  module: PostureModule;
  onPress: () => void;
  isPro: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const locked = !isPro;

  return (
    <TouchableOpacity style={styles.moduleCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.moduleStripe} />
      <View style={styles.moduleTop}>
        <View style={[styles.intensityChip, { backgroundColor: INTENSITY_COLOR[module.intensity] + '22', borderColor: INTENSITY_COLOR[module.intensity] + '55' }]}>
          <Text style={[styles.intensityChipText, { color: INTENSITY_COLOR[module.intensity] }]}>
            {INTENSITY_LABEL[module.intensity].toUpperCase()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {locked && <Ionicons name="lock-closed" size={12} color={Colors.secondaryText} />}
          {isPro && (
            <TouchableOpacity
              onPress={onToggleFavorite}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={17}
                color={isFavorite ? '#F5C518' : Colors.tertiaryText}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.moduleContent}>
        <View style={styles.moduleNameRow}>
          <View style={[styles.moduleIconCircle, { backgroundColor: INTENSITY_COLOR[module.intensity] + '22' }]}>
            <Ionicons name={(MODULE_ICON[module.id] ?? 'layers-outline') as any} size={18} color={INTENSITY_COLOR[module.intensity]} />
          </View>
          <Text style={styles.moduleName}>{module.name}</Text>
        </View>
        <Text style={styles.moduleTagline} numberOfLines={2}>{module.tagline}</Text>
        <Text style={styles.moduleMeta}>
          {module.exercise_ids.length} exercises · {module.est_minutes} min
        </Text>
        {locked ? (
          <View style={styles.upgradeBadge}>
            <Ionicons name="lock-closed" size={10} color={Colors.white} style={{ marginRight: 4 }} />
            <Text style={styles.upgradeBadgeText}>Upgrade to unlock</Text>
          </View>
        ) : (
          <View style={styles.tapChip}>
            <Text style={styles.tapChipText}>View program</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function CustomProgramCard({
  program, onPress, isFavorite, onToggleFavorite,
}: {
  program: CustomProgram;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <TouchableOpacity style={styles.moduleCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.moduleStripe} />
      <View style={styles.moduleTop}>
        <View style={[styles.intensityChip, { backgroundColor: CUSTOM_PURPLE + '22', borderColor: CUSTOM_PURPLE + '55' }]}>
          <Text style={[styles.intensityChipText, { color: CUSTOM_PURPLE }]}>CUSTOM</Text>
        </View>
        <TouchableOpacity onPress={onToggleFavorite} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={17}
            color={isFavorite ? '#F5C518' : Colors.tertiaryText}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.moduleContent}>
        <View style={styles.moduleNameRow}>
          <View style={[styles.moduleIconCircle, { backgroundColor: CUSTOM_PURPLE + '22' }]}>
            <Ionicons name="color-wand" size={18} color={CUSTOM_PURPLE} />
          </View>
          <Text style={styles.moduleName}>{program.name}</Text>
        </View>
        <Text style={styles.moduleMeta}>{program.exerciseIds.length} exercises</Text>
        <View style={styles.tapChip}>
          <Text style={styles.tapChipText}>View program</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ModulesTab() {
  const router = useRouter();
  const { profile } = useUserStore();
  const isPro = profile?.isPro ?? false;
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [customPrograms, setCustomPrograms] = useState<CustomProgram[]>([]);

  const INTENSITY_ORDER = { easy: 0, moderate: 1, hard: 2 };
  const allModules = [...moduleRepository.allModules].sort(
    (a, b) => INTENSITY_ORDER[a.intensity] - INTENSITY_ORDER[b.intensity] || a.name.localeCompare(b.name)
  );

  useFocusEffect(useCallback(() => {
    getFavoriteModuleIds().then((ids) => setFavoriteIds(new Set(ids)));
    if (isPro) getCustomPrograms().then(setCustomPrograms);
  }, [isPro]));

  function openDetail(moduleId: string) {
    if (!isPro) {
      router.push({ pathname: '/(onboarding)/paywall', params: { directToPlan: '1' } });
      return;
    }
    router.push({ pathname: '/program-detail', params: { moduleId } });
  }

  async function toggleFavorite(moduleId: string) {
    if (favoriteIds.has(moduleId)) {
      await removeFavoriteModule(moduleId);
      setFavoriteIds((prev) => { const s = new Set(prev); s.delete(moduleId); return s; });
    } else {
      await addFavoriteModule(moduleId);
      setFavoriteIds((prev) => new Set([...prev, moduleId]));
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>


        {/* Browse row */}
        <TouchableOpacity style={styles.browseRow} activeOpacity={0.8} onPress={() => {
          if (!isPro) { router.push({ pathname: '/(onboarding)/paywall', params: { directToPlan: '1' } }); return; }
          router.push('/library');
        }}>
          <Ionicons name="search" size={18} color={Colors.white} style={{ marginRight: Spacing.tight }} />
          <Text style={[styles.browseTitle, { flex: 1 }]}>Search & filter our full exercise library</Text>
          <Ionicons name={isPro ? 'chevron-forward' : 'lock-closed'} size={18} color={isPro ? Colors.secondaryText : Colors.white} />
        </TouchableOpacity>

        {/* Custom plan row */}
        <TouchableOpacity
          style={styles.customRow}
          activeOpacity={0.8}
          onPress={() => {
            if (!isPro) {
              router.push({ pathname: '/(onboarding)/paywall', params: { directToPlan: '1' } });
              return;
            }
            router.push('/create-program');
          }}
        >
          <View style={styles.customIcon}>
            <Ionicons name="add" size={18} color={Colors.primaryText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.customTitle}>Build a custom plan</Text>
            <Text style={styles.customSub}>Design your own stretch routine</Text>
          </View>
          {!isPro && (
            <View style={styles.proBadge}>
              <Ionicons name="lock-closed" size={10} color={Colors.white} style={{ marginRight: 3 }} />
              <Text style={styles.proBadgeText}>Pro</Text>
            </View>
          )}
        </TouchableOpacity>

        {customPrograms.map((prog) => (
          <CustomProgramCard
            key={prog.id}
            program={prog}
            isFavorite={favoriteIds.has(prog.id)}
            onPress={() => router.push({ pathname: '/custom-program-detail', params: { programId: prog.id } })}
            onToggleFavorite={() => toggleFavorite(prog.id)}
          />
        ))}

        {allModules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            isPro={isPro}
            isFavorite={favoriteIds.has(module.id)}
            onPress={() => openDetail(module.id)}
            onToggleFavorite={() => toggleFavorite(module.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.card, paddingTop: Spacing.inner, paddingBottom: Spacing.card, gap: Spacing.gap },
  heading: { ...Typography.title },
  sub: { ...Typography.body, fontSize: 17, lineHeight: 24, color: Colors.secondaryText, marginTop: 4 },
  browseRow: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    flexDirection: 'row',
    alignItems: 'center',
  },
  browseTitle: { ...Typography.bodyMedium, color: Colors.white },
  browseSub: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.white + 'AA', marginTop: 1 },
  customRow: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.inner,
  },
  customIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.icon,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTitle: { ...Typography.bodyMedium },
  customSub: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText, marginTop: 1 },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.tight,
    paddingVertical: 4,
  },
  proBadgeText: { ...Typography.caption, color: Colors.white, fontFamily: FontFamily.poppinsBold },
  sectionTitle: { ...Typography.subheadline, marginTop: Spacing.micro },
  moduleCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    overflow: 'hidden',
    minHeight: 160,
  },
  moduleStripe: {
    ...StyleSheet.absoluteFill,
    opacity: 0.06,
    backgroundColor: Colors.white,
  },
  moduleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.inner,
    paddingBottom: 0,
  },
  intensityChip: {
    borderRadius: Radii.chip,
    borderWidth: 1,
    paddingHorizontal: Spacing.tight,
    paddingVertical: 3,
  },
  intensityChipText: { ...Typography.caption, fontSize: 13, lineHeight: 18, fontFamily: FontFamily.poppinsBold, letterSpacing: 0.8 },
  moduleContent: { padding: Spacing.inner, gap: Spacing.micro },
  moduleNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.tight },
  moduleIconCircle: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  moduleName: { ...Typography.headline, flex: 1 },
  moduleTagline: { ...Typography.body, fontSize: 17, lineHeight: 24, color: Colors.secondaryText },
  moduleMeta: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.tertiaryText, marginTop: 2 },
  tapChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.cardElevated,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.tight,
    paddingVertical: 4,
    marginTop: Spacing.micro,
  },
  tapChipText: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText },
  upgradeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.tight,
    paddingVertical: 4,
    marginTop: Spacing.micro,
  },
  upgradeBadgeText: { ...Typography.caption, color: Colors.white, fontFamily: FontFamily.poppinsBold },
});
