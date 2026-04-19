import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEventOrmEntity } from './infrastructure/persistence/AnalyticsEventOrmEntity';
import { AnalyticsController } from './presentation/controllers/AnalyticsController';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsEventOrmEntity])],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
