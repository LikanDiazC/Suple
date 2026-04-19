import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GmailConnectionOrmEntity } from './infrastructure/persistence/GmailConnectionOrmEntity';
import { GmailSentMessageOrmEntity } from './infrastructure/persistence/GmailSentMessageOrmEntity';
import { GoogleOAuthService } from './infrastructure/services/GoogleOAuthService';
import { GmailApiService } from './infrastructure/services/GmailApiService';
import { GmailController } from './presentation/controllers/GmailController';
import { GmailTrackingController } from './presentation/controllers/GmailTrackingController';

@Module({
  imports: [TypeOrmModule.forFeature([GmailConnectionOrmEntity, GmailSentMessageOrmEntity])],
  controllers: [GmailController, GmailTrackingController],
  providers: [GoogleOAuthService, GmailApiService],
  exports: [GoogleOAuthService, GmailApiService],
})
export class GmailModule {}
