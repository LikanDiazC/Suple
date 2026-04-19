import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/IUserRepository';

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

const MIN_PASSWORD_LEN = 10;

@Injectable()
export class ChangePasswordUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    if (input.newPassword.length < MIN_PASSWORD_LEN) {
      throw new UnauthorizedException(`Password must be at least ${MIN_PASSWORD_LEN} characters`);
    }
    if (input.newPassword === input.currentPassword) {
      throw new UnauthorizedException('New password must differ from current');
    }

    const user = await this.users.findById(input.userId);
    if (!user) throw new NotFoundException('User not found');

    const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!matches) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await bcrypt.hash(input.newPassword, 12);
    user.changePassword(newHash);
    await this.users.save(user);
  }
}
