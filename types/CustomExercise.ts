import { ExerciseSlot } from './Exercise';

export interface CustomExercise {
  id: string;
  name: string;
  description: string;
  photoUri: string | null;
  slot: ExerciseSlot;
  durationSeconds: number;
  createdAt: string;
}
