import { Exercise } from './Exercise';

export type ModuleIntensity = 'easy' | 'moderate' | 'hard';

export interface PostureModule {
  id: string;
  name: string;
  category: string;
  tagline: string;
  est_minutes: number;
  intensity: ModuleIntensity;
  rationale: string;
  exercise_ids: string[];
}

export interface ResolvedModule {
  module: PostureModule;
  exercises: Exercise[];
}

export const TAILORED_MODULE_IDS = new Set([
  'tech_neck_fix',
  'shoulder_unrounding',
  'hip_flexor_reset',
  'desk_break_reset',
  'gamer_reset',
  'glute_activation',
  'prone_shoulder_series',
  'deep_neck_protocol',
]);

export const INTENSITY_LABEL: Record<ModuleIntensity, string> = {
  easy: 'Beginner',
  moderate: 'Intermediate',
  hard: 'Advanced',
};

export const MODULE_ICON: Record<string, string> = {
  morning_unlock:        'sunny-outline',          // sun — morning
  desk_break_reset:      'desktop-outline',        // monitor — desk
  bedtime_release:       'moon-outline',           // moon — night
  tech_neck_fix:         'phone-portrait-outline', // phone — tech neck
  shoulder_unrounding:   'body-outline',           // figure — shoulders
  upper_back_kyphosis:   'trending-up-outline',    // upward — straightening
  lower_back_core:       'fitness-outline',        // dumbbell — core strength
  hip_flexor_reset:      'walk-outline',           // walking — hips
  gamer_reset:           'game-controller-outline',// controller — gaming
  full_body_alignment:   'globe-outline',          // globe — full/complete body
  seated_neck_relief:    'headset-outline',        // headset — seated at desk
  chest_and_spine_open:  'expand-outline',         // expand — chest opening
  rotation_flow:         'sync-outline',           // circular — rotation
  glute_activation:      'barbell-outline',        // barbell — activation
  shoulder_stability:    'shield-outline',         // shield — stability
  prone_shoulder_series: 'layers-outline',         // layers — series/sequence
  lateral_chain:         'shuffle-outline',        // shuffle — lateral movement
  deep_neck_protocol:    'pulse-outline',          // pulse — deep/precise
  dynamic_core:          'flash-outline',          // flash — dynamic energy
  balance_training:      'footsteps-outline',      // footsteps — proprioception
};
