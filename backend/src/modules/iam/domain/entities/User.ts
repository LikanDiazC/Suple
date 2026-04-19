import { AggregateRoot, UniqueId } from '../../../../shared/kernel';

export type UserStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';

interface UserProps {
  email: string;
  passwordHash: string;
  fullName: string;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  roleIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export class User extends AggregateRoot<UserProps> {
  private constructor(id: UniqueId, tenantId: string, props: UserProps) {
    super(id, tenantId, props);
  }

  static invite(
    tenantId: string,
    email: string,
    fullName: string,
    initialPasswordHash: string,
    roleIds: string[],
  ): User {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email');
    }
    const now = new Date();
    return new User(UniqueId.create(), tenantId, {
      email: email.toLowerCase(),
      passwordHash: initialPasswordHash,
      fullName,
      status: 'INVITED',
      mustChangePassword: true,
      lastLoginAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      roleIds: [...roleIds],
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(id: UniqueId, tenantId: string, props: UserProps): User {
    return new User(id, tenantId, props);
  }

  isLocked(now: Date = new Date()): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil > now;
  }

  recordSuccessfulLogin(now: Date = new Date()): void {
    this.props.lastLoginAt = now;
    this.props.failedLoginCount = 0;
    this.props.lockedUntil = null;
    if (this.props.status === 'INVITED') {
      this.props.status = 'ACTIVE';
    }
    this.props.updatedAt = now;
  }

  recordFailedLogin(now: Date = new Date()): void {
    this.props.failedLoginCount += 1;
    if (this.props.failedLoginCount >= MAX_FAILED_LOGINS) {
      this.props.lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);
    }
    this.props.updatedAt = now;
  }

  changePassword(newHash: string): void {
    if (!newHash || newHash.length < 20) {
      throw new Error('Invalid password hash');
    }
    this.props.passwordHash = newHash;
    this.props.mustChangePassword = false;
    this.props.updatedAt = new Date();
  }

  disable(): void {
    this.props.status = 'DISABLED';
    this.props.updatedAt = new Date();
  }

  get email(): string { return this.props.email; }
  get fullName(): string { return this.props.fullName; }
  get passwordHash(): string { return this.props.passwordHash; }
  get status(): UserStatus { return this.props.status; }
  get mustChangePassword(): boolean { return this.props.mustChangePassword; }
  get roleIds(): ReadonlyArray<string> { return this.props.roleIds; }
  get isActive(): boolean { return this.props.status === 'ACTIVE' || this.props.status === 'INVITED'; }
}
