import { User } from '../entities/User';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  status: string;
  role: string;
  managerId: string | null;
  createdAt: string;
}

export interface IUserRepository {
  /** Tenant-scoped lookup (RLS-protected). */
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;

  /** System-level lookup (bypasses RLS). Used by LoginUseCase. */
  findByEmailAcrossTenants(email: string): Promise<User | null>;

  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;

  listByTenant(): Promise<UserSummary[]>;
  setManager(userId: string, managerId: string | null): Promise<void>;
}
