import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './AppDataSource';
import { SystemQueryRunner } from '../../shared/infrastructure/SystemQueryRunner';

@Global()
@Module({
  imports: [TypeOrmModule.forRoot(dataSourceOptions)],
  providers: [SystemQueryRunner],
  exports: [TypeOrmModule, SystemQueryRunner],
})
export class DatabaseModule {}
