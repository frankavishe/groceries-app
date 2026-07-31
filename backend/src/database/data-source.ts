import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

type PostgresDataSourceOptions = Extract<
  DataSourceOptions,
  { type: 'postgres' }
>;

export const dataSourceOptions: PostgresDataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'groceries',
  password: process.env.DB_PASSWORD ?? 'groceries',
  database: process.env.DB_NAME ?? 'groceries',
  entities: [],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
};

export default new DataSource(dataSourceOptions);
