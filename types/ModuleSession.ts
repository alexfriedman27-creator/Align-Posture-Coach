export interface ModuleSession {
  id: string;
  moduleId: string;
  date: string;
  completedExerciseIds: string[];
  durationSeconds: number;
  xpEarned: number;
}
