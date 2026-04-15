import { DomainEvent } from '../../../../shared/kernel';

export class ProcessDefinitionPublishedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'bpms.definition.published';

  constructor(
    tenantId: string,
    public readonly definitionId: string,
    public readonly definitionName: string,
    public readonly version: number,
  ) {
    super(tenantId);
  }

  get eventName(): string {
    return ProcessDefinitionPublishedEvent.EVENT_NAME;
  }

  toPayload(): Record<string, unknown> {
    return {
      ...super.toPayload(),
      definitionId: this.definitionId,
      definitionName: this.definitionName,
      version: this.version,
    };
  }
}
