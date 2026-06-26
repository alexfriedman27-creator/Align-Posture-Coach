export type ExerciseCategory = 'stretch' | 'strengthen' | 'mobility' | 'awareness';

export type ExerciseSlot =
  | 'neck'
  | 'shoulder_scapula'
  | 'thoracic_spine'
  | 'core_pelvis'
  | 'hip'
  | 'integration';

export const SLOT_BADGE: Record<ExerciseSlot, string> = {
  neck: 'NK',
  shoulder_scapula: 'SH',
  thoracic_spine: 'TH',
  core_pelvis: 'CO',
  hip: 'HP',
  integration: 'IN',
};

export const SLOT_NAME: Record<ExerciseSlot, string> = {
  neck: 'Neck',
  shoulder_scapula: 'Shoulders',
  thoracic_spine: 'Thoracic',
  core_pelvis: 'Core',
  hip: 'Hips',
  integration: 'Integration',
};

export const DAILY_SLOTS: ExerciseSlot[] = [
  'neck',
  'shoulder_scapula',
  'thoracic_spine',
  'core_pelvis',
  'hip',
];

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  slot: ExerciseSlot;
  family_id: string;
  position: string;
  equipment: string;
  duration_seconds: number;
  evidence_weight: 1 | 2 | 3;
  cooldown_days: number;
  target_condition: string[];
  description: string;
  instructions: string[];
  reps?: number;
  sets?: number;
}
