import { PostureModule, ResolvedModule, TAILORED_MODULE_IDS } from '../../types/Module';
import { exerciseRepository } from './ExerciseRepository';
import rawData from './modules.json';

interface ModulesJson {
  modules: PostureModule[];
}

class ModuleRepository {
  readonly allModules: PostureModule[];
  private readonly byId: Map<string, PostureModule>;

  constructor() {
    const data = rawData as ModulesJson;
    this.allModules = data.modules;
    this.byId = new Map(this.allModules.map((m) => [m.id, m]));
  }

  get tailoredModules(): PostureModule[] {
    return this.allModules.filter((m) => TAILORED_MODULE_IDS.has(m.id));
  }

  get generalModules(): PostureModule[] {
    return this.allModules.filter((m) => !TAILORED_MODULE_IDS.has(m.id));
  }

  module(id: string): PostureModule | undefined {
    return this.byId.get(id);
  }

  resolved(module: PostureModule): ResolvedModule {
    return {
      module,
      exercises: exerciseRepository.exercises(module.exercise_ids),
    };
  }
}

export const moduleRepository = new ModuleRepository();
