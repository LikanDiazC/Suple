import { Module, OnModuleInit, Logger } from '@nestjs/common';

// ── Repository symbols & interfaces ──────────────────────────────────────────
import { PROCESS_DEFINITION_REPOSITORY } from './domain/repositories/IProcessDefinitionRepository';
import { PROCESS_INSTANCE_REPOSITORY }   from './domain/repositories/IProcessInstanceRepository';
import { TASK_REPOSITORY }               from './domain/repositories/ITaskRepository';

// ── Infrastructure — InMemory repositories (swap → TypeORM/Prisma in prod) ───
import { InMemoryProcessDefinitionRepository } from './infrastructure/repositories/InMemoryProcessDefinitionRepository';
import { InMemoryProcessInstanceRepository }   from './infrastructure/repositories/InMemoryProcessInstanceRepository';
import { InMemoryTaskRepository }              from './infrastructure/repositories/InMemoryTaskRepository';

// ── Seeder ────────────────────────────────────────────────────────────────────
import { ProcessTemplateSeeder } from './infrastructure/seeders/ProcessTemplateSeeder';

// ── Domain services ───────────────────────────────────────────────────────────
import { DAGExecutionEngine } from './domain/services/DAGExecutionEngine';

// ── Application use cases ─────────────────────────────────────────────────────
import { CreateProcessDefinition } from './application/use-cases/CreateProcessDefinition';
import { StartProcess }            from './application/use-cases/StartProcess';
import { CompleteTask }            from './application/use-cases/CompleteTask';
import { GetTasksForUser }         from './application/use-cases/GetTasksForUser';

// ── Presentation ──────────────────────────────────────────────────────────────
import { BpmsController } from './presentation/controllers/BpmsController';

/**
 * ==========================================================================
 * BPMS Module — Business Process Management System
 * ==========================================================================
 *
 * Provides a full workflow engine for the enterprise platform:
 *   - Visual process designer (frontend: React Flow canvas)
 *   - Process definitions with versioning (DRAFT → ACTIVE → DEPRECATED)
 *   - Process instances with parallel/sequential execution paths
 *   - Human tasks with SLA tracking and role-based assignment
 *   - Business rule evaluation on transitions (XOR/AND/OR gateways)
 *
 * Pre-loaded templates (seeded on startup):
 *   1. Pedido de Muebles    (ventas)
 *   2. Compra de Material   (compras)
 *   3. Orden de Trabajo     (produccion)
 *
 * EventBus is injected via @Global() InfrastructureModule — no explicit
 * import needed here.
 * ==========================================================================
 */
@Module({
  controllers: [BpmsController],
  providers: [
    // ── Repositories ────────────────────────────────────────────────────────
    {
      provide:  PROCESS_DEFINITION_REPOSITORY,
      useClass: InMemoryProcessDefinitionRepository,
    },
    {
      provide:  PROCESS_INSTANCE_REPOSITORY,
      useClass: InMemoryProcessInstanceRepository,
    },
    {
      provide:  TASK_REPOSITORY,
      useClass: InMemoryTaskRepository,
    },

    // ── Domain services ──────────────────────────────────────────────────────
    DAGExecutionEngine,

    // ── Seeder ───────────────────────────────────────────────────────────────
    ProcessTemplateSeeder,

    // ── Use Cases ────────────────────────────────────────────────────────────
    // EventBus auto-injected via @Global() InfrastructureModule
    CreateProcessDefinition,
    StartProcess,
    CompleteTask,
    GetTasksForUser,
  ],
  exports: [
    PROCESS_DEFINITION_REPOSITORY,
    PROCESS_INSTANCE_REPOSITORY,
    TASK_REPOSITORY,
    StartProcess,
    CompleteTask,
  ],
})
export class BpmsModule implements OnModuleInit {
  private readonly logger = new Logger(BpmsModule.name);

  constructor(private readonly seeder: ProcessTemplateSeeder) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seeder.seed('_system_');
      this.logger.log('BPMS process templates seeded successfully');
    } catch (err) {
      this.logger.error('Failed to seed BPMS templates', err);
    }
  }
}
