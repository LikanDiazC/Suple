import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignOrmEntity } from './infrastructure/persistence/CampaignOrmEntity';
import { CampaignController } from './presentation/controllers/CampaignController';
import { MarketingFormController } from './presentation/controllers/MarketingFormController';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignOrmEntity])],
  controllers: [CampaignController, MarketingFormController],
})
export class MarketingModule {}
