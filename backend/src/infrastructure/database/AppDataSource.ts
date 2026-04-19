import { DataSource, DataSourceOptions } from 'typeorm';
import { TenantRlsSubscriber } from '../../shared/infrastructure/TenantRlsSubscriber';

/**
 * Single global TypeORM DataSource. Importable from anywhere.
 *
 * Entities are auto-loaded via glob — every module that adds an
 * *OrmEntity.ts under modules/<x>/infrastructure/persistence/ is
 * picked up automatically. No manual entity registration.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'suple',
  password: process.env.DB_PASSWORD ?? 'suple',
  database: process.env.DB_NAME ?? 'suple',
  entities: [
    __dirname + '/../../modules/**/infrastructure/persistence/*OrmEntity.{ts,js}',
    __dirname + '/../../shared/infrastructure/*OrmEntity.{ts,js}',
  ],
  migrations: [__dirname + '/migrations/*.{ts,js,sql}'],
  subscribers: [TenantRlsSubscriber],
  synchronize: false,         // never true — migrations only
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  poolSize: Number(process.env.DB_POOL_SIZE ?? 20),
};

export const AppDataSource = new DataSource(dataSourceOptions);
