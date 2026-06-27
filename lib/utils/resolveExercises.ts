import { Exercise, ExerciseCategory } from '../../types/Exercise';
import { CustomExercise } from '../../types/CustomExercise';
import { exerciseRepository } from '../data/ExerciseRepository';
import { getCustomExercises } from '../db/queries';

export function customToExercise(c: CustomExercise): Exercise {
  return {
    id: c.id,
    name: c.name,
    category: 'stretch' as ExerciseCategory,
    slot: c.slot,
    family_id: c.id,
    position: 'any',
    equipment: 'none',
    duration_seconds: c.durationSeconds,
    evidence_weight: 1,
    cooldown_days: 0,
    target_condition: [],
    description: c.description,
    instructions: [],
  };
}

export async function resolveExerciseIds(ids: string[]): Promise<Exercise[]> {
  const customExs = await getCustomExercises();
  const customById = new Map(customExs.map((e) => [e.id, customToExercise(e)]));
  return ids
    .map((id) => exerciseRepository.exercise(id) ?? customById.get(id))
    .filter((e): e is Exercise => e != null);
}
