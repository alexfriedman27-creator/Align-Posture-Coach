import { Exercise, ExerciseSlot } from '../../types/Exercise';
import rawData from './exercises.json';

interface ExercisesJson {
  exercises: Exercise[];
}

class ExerciseRepository {
  private readonly byId: Map<string, Exercise>;
  private readonly bySlot: Map<ExerciseSlot, Exercise[]>;
  readonly allExercises: Exercise[];

  constructor() {
    const data = rawData as ExercisesJson;
    this.allExercises = data.exercises;
    this.byId = new Map(this.allExercises.map((e) => [e.id, e]));
    this.bySlot = new Map();
    for (const exercise of this.allExercises) {
      const list = this.bySlot.get(exercise.slot) ?? [];
      list.push(exercise);
      this.bySlot.set(exercise.slot, list);
    }
  }

  exercise(id: string): Exercise | undefined {
    return this.byId.get(id);
  }

  exercises(forIds: string[]): Exercise[] {
    return forIds.map((id) => this.byId.get(id)).filter((e): e is Exercise => e !== undefined);
  }

  exercisesForSlot(slot: ExerciseSlot): Exercise[] {
    return this.bySlot.get(slot) ?? [];
  }
}

export const exerciseRepository = new ExerciseRepository();
