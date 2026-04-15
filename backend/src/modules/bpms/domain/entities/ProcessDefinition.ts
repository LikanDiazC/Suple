import { AggregateRoot, UniqueId, Result } from '../../../../shared/kernel';
import { FlowNode } from '../value-objects/FlowNode';
import { Transition } from '../value-objects/Transition';
import { ProcessGraph, DAGExecutionEngine } from '../services/DAGExecutionEngine';
import { ProcessDefinitionPublishedEvent } from '../events/ProcessDefinitionPublishedEvent';

export enum ProcessDefinitionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}

interface ProcessDefinitionProps {
  name: string;
  description: string;
  version: number;
  status: ProcessDefinitionStatus;
  nodes: FlowNode[];
  transitions: Transition[];
  category: string;   // e.g. 'ventas', 'compras', 'produccion'
  icon?: string;      // emoji or icon name
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProcessDefinition extends AggregateRoot<ProcessDefinitionProps> {
  private constructor(id: UniqueId, tenantId: string, props: ProcessDefinitionProps) {
    super(id, tenantId, props);
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  static create(
    tenantId: string,
    raw: { name: string; description: string; category: string; createdBy: string; icon?: string },
  ): Result<ProcessDefinition> {
    if (!raw.name || raw.name.trim().length === 0) {
      return Result.fail('ProcessDefinition name is required');
    }
    if (!raw.category || raw.category.trim().length === 0) {
      return Result.fail('ProcessDefinition category is required');
    }

    const now = new Date();
    const definition = new ProcessDefinition(UniqueId.create(), tenantId, {
      name: raw.name.trim(),
      description: raw.description ?? '',
      version: 1,
      status: ProcessDefinitionStatus.DRAFT,
      nodes: [],
      transitions: [],
      category: raw.category.trim(),
      icon: raw.icon,
      createdBy: raw.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return Result.ok(definition);
  }

  static reconstitute(
    id: string,
    tenantId: string,
    props: ProcessDefinitionProps,
  ): ProcessDefinition {
    return new ProcessDefinition(UniqueId.from(id), tenantId, props);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get version(): number { return this.props.version; }
  get status(): ProcessDefinitionStatus { return this.props.status; }
  get nodes(): ReadonlyArray<FlowNode> { return this.props.nodes; }
  get transitions(): ReadonlyArray<Transition> { return this.props.transitions; }
  get category(): string { return this.props.category; }
  get icon(): string | undefined { return this.props.icon; }
  get createdBy(): string { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // ---------------------------------------------------------------------------
  // Node management
  // ---------------------------------------------------------------------------

  addNode(node: FlowNode): Result<void> {
    const duplicate = this.props.nodes.find((n) => n.id === node.id);
    if (duplicate) {
      return Result.fail(`Node with id "${node.id}" already exists in this process definition`);
    }
    this.props.nodes.push(node);
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  removeNode(nodeId: string): Result<void> {
    const referencedByTransition = this.props.transitions.some(
      (t) => t.fromNodeId === nodeId || t.toNodeId === nodeId,
    );
    if (referencedByTransition) {
      return Result.fail(
        `Cannot remove node "${nodeId}": it is still referenced by one or more transitions`,
      );
    }

    const index = this.props.nodes.findIndex((n) => n.id === nodeId);
    if (index === -1) {
      return Result.fail(`Node with id "${nodeId}" not found`);
    }

    this.props.nodes.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  // ---------------------------------------------------------------------------
  // Transition management
  // ---------------------------------------------------------------------------

  addTransition(transition: Transition): Result<void> {
    const sourceExists = this.props.nodes.some((n) => n.id === transition.fromNodeId);
    if (!sourceExists) {
      return Result.fail(
        `Source node "${transition.fromNodeId}" does not exist in this process definition`,
      );
    }

    const targetExists = this.props.nodes.some((n) => n.id === transition.toNodeId);
    if (!targetExists) {
      return Result.fail(
        `Target node "${transition.toNodeId}" does not exist in this process definition`,
      );
    }

    this.props.transitions.push(transition);
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  removeTransition(fromNodeId: string, toNodeId: string): void {
    const index = this.props.transitions.findIndex(
      (t) => t.fromNodeId === fromNodeId && t.toNodeId === toNodeId,
    );
    if (index !== -1) {
      this.props.transitions.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  publish(): Result<void> {
    if (this.props.status !== ProcessDefinitionStatus.DRAFT) {
      return Result.fail(
        `Only DRAFT definitions can be published. Current status: ${this.props.status}`,
      );
    }

    const graph = this.toProcessGraph();
    const validation = new DAGExecutionEngine().validateGraph(graph);
    if (validation.isFail()) {
      return Result.fail(validation.error);
    }

    this.props.status = ProcessDefinitionStatus.ACTIVE;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ProcessDefinitionPublishedEvent(
        this.tenantId,
        this.id.toString(),
        this.props.name,
        this.props.version,
      ),
    );

    return Result.ok(undefined);
  }

  deprecate(): void {
    if (this.props.status === ProcessDefinitionStatus.ACTIVE) {
      this.props.status = ProcessDefinitionStatus.DEPRECATED;
      this.props.updatedAt = new Date();
    }
  }

  // ---------------------------------------------------------------------------
  // Graph conversion
  // ---------------------------------------------------------------------------

  toProcessGraph(): ProcessGraph {
    return {
      nodes: this.props.nodes.map((n) => n.toProcessNode()),
      transitions: [...this.props.transitions],
    };
  }

  // ---------------------------------------------------------------------------
  // Metadata update
  // ---------------------------------------------------------------------------

  updateMetadata(name?: string, description?: string, category?: string): void {
    if (name !== undefined && name.trim().length > 0) {
      this.props.name = name.trim();
    }
    if (description !== undefined) {
      this.props.description = description;
    }
    if (category !== undefined && category.trim().length > 0) {
      this.props.category = category.trim();
    }
    this.props.updatedAt = new Date();
  }
}
