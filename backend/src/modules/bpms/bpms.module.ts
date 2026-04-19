import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PROCESS_DEFINITION_REPOSITORY } from './domain/repositories/IProcessDefinitionRepository';
import { PROCESS_INSTANCE_REPOSITORY }   from './domain/repositories/IProcessInstanceRepository';
import { TASK_REPOSITORY }               from './domain/repositories/ITaskRepository';

import { ProcessDefinitionOrmEntity } from './infrastructure/persistence/ProcessDefinitionOrmEntity';
import { ProcessInstanceOrmEntity }   from './infrastructure/persistence/ProcessInstanceOrmEntity';
import { TaskOrmEntity }              from './infrastructure/persistence/TaskOrmEntity';

import { TypeOrmProcessDefinitionRepository } from './infrastructure/persistence/TypeOrmProcessDefinitionRepository';
import { TypeOrmProcessInstanceRepository }   from './infrastructure/persistence/TypeOrmProcessInstanceRepository';
import { TypeOrmTaskRepository }              from './infrastructure/persistence/TypeOrmTaskRepository';

import { DAGExecutionEngine } from './domain/services/DAGExecutionEngine';

import { CreateProcessDefinition } from './application/use-cases/CreateProcessDefinition';
import { StartProcess }            from './application/use-cases/StartProcess';
import { CompleteTask }            from './application/use-cases/CompleteTask';
import { GetTasksForUser }         from './application/use-cases/GetTasksForUser';

import { BpmsController } from './presentation/controllers/BpmsController';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessDefinitionOrmEntity, ProcessInstanceOrmEntity, TaskOrmEntity])],
  controllers: [BpmsController],
  providers: [
    { provide: PROCESS_DEFINITION_REPOSITORY, useClass: TypeOrmProcessDefinitionRepository },
    { provide: PROCESS_INSTANCE_REPOSITORY,   useClass: TypeOrmProcessInstanceRepository },
    { provide: TASK_REPOSITORY,               useClass: TypeOrmTaskRepository },
    DAGExecutionEngine,
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
export class BpmsModule {}
