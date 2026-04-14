import { Entity, UniqueId } from '../../../../shared/kernel';

export enum Permission {
  // CRM
  CRM_CONTACT_READ = 'crm:contact:read',
  CRM_CONTACT_WRITE = 'crm:contact:write',
  CRM_CONTACT_DELETE = 'crm:contact:delete',
  CRM_PIPELINE_MANAGE = 'crm:pipeline:manage',

  // ERP
  ERP_JOURNAL_READ = 'erp:journal:read',
  ERP_JOURNAL_WRITE = 'erp:journal:write',
  ERP_REPORT_GENERATE = 'erp:report:generate',
  ERP_PERIOD_CLOSE = 'erp:period:close',

  // SCM
  SCM_INVENTORY_READ = 'scm:inventory:read',
  SCM_INVENTORY_WRITE = 'scm:inventory:write',
  SCM_ORDER_APPROVE = 'scm:order:approve',
  SCM_FORECAST_RUN = 'scm:forecast:run',

  // BPMS
  BPMS_PROCESS_DESIGN = 'bpms:process:design',
  BPMS_PROCESS_EXECUTE = 'bpms:process:execute',
  BPMS_TASK_REASSIGN = 'bpms:task:reassign',

  // Admin
  IAM_USER_MANAGE = 'iam:user:manage',
  IAM_ROLE_MANAGE = 'iam:role:manage',
  TENANT_SETTINGS = 'tenant:settings:manage',
}

interface RoleProps {
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
}

export class Role extends Entity<RoleProps> {
  private constructor(id: UniqueId, tenantId: string, props: RoleProps) {
    super(id, tenantId, props);
  }

  static create(
    tenantId: string,
    name: string,
    description: string,
    permissions: Permission[],
    isSystemRole = false,
  ): Role {
    return new Role(UniqueId.create(), tenantId, {
      name,
      description,
      permissions: [...permissions],
      isSystemRole,
    });
  }

  hasPermission(permission: Permission): boolean {
    return this.props.permissions.includes(permission);
  }

  get name(): string { return this.props.name; }
  get permissions(): ReadonlyArray<Permission> { return this.props.permissions; }
}
