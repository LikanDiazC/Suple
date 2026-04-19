import { Body, Controller, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { LoginUseCase } from '../../application/use-cases/LoginUseCase';
import { ChangePasswordUseCase } from '../../application/use-cases/ChangePasswordUseCase';
import { InviteUserUseCase } from '../../application/use-cases/InviteUserUseCase';
import { LoginDto, ChangePasswordDto, InviteUserDto } from '../dtos/LoginDto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly inviteUser: InviteUserUseCase,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async loginHandler(@Body() dto: LoginDto) {
    const result = await this.login.execute(dto);
    return result;
  }

  @Post('change-password')
  @HttpCode(204)
  async changePasswordHandler(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    if (!req.authenticatedUser) throw new UnauthorizedException();
    await this.changePassword.execute({
      userId: req.authenticatedUser.userId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  @Post('invite')
  @HttpCode(201)
  async inviteHandler(@Body() dto: InviteUserDto) {
    return await this.inviteUser.execute(dto);
  }
}
