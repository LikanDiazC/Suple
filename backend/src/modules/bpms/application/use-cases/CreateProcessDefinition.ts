import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import {
  ProcessDefinition,
} from '../../domain/entities/ProcessDefinition';
import {
  IProcessDefinitionRepository,
  PROCESS_DEFINITION_REPOSITORY,
} from '../../domain/repositories/IProcessDefinitionRepository';
import { EventBus } from '../../../../infrastructure/messaging/events/EventBus';

// ── Command / Result ──────────────────────────────────────────────────────────

export interface CreateProcessDefinitionCommand {
  tenantId:    string;
  name:        string;
  description: string;
  category:    string;
  icon?:       string;
  createdBy:   string;
}

export interface CreateProcessDefinitionResult {
  definitionId: string;
}

// ── Use Case ──────────────────────────────────────────────────────────────────

@Injectable()
export class CreateProcessDefinition {
  constructor(
    @Inject(PROCESS_DEFINITION_REPOSITORY)
    private readonly definitionRepo: IProcessDefinitionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    cmd: CreateProcessDefinitionCommand,
  ): Promise<Result<CreateProcessDefinitionResult>> {
    // 1. Build the aggregate via its factory
    const createResult = ProcessDefinition.create(cmd.tenantId, {
      name:        cmd.name,
      description: cmd.description,
      category:    cmd.category,
      icon:        cmd.icon,
      createdBy:   cmd.createdBy,
    });

    if (createResult.isFail()) {
      return Result.fail(createResult.error);
    }

    const definition = createResult.value;

    // 2. Persist
    await this.definitionRepo.save(definition);

    // 3. Collect and publish domain events
    const events = definition.clearEvents();
    await this.eventBus.publishAll(events);

    return Result.ok({ definitionId: definition.id.toString() });
  }
}
