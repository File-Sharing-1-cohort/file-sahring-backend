import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const dataSourceOptionst: DataSourceOptions = {
  type: 'postgres',
  host: process.env.PGHOST || "127.0.0.1",
  port: 5432,
  username: process.env.PGUSER || "admin",
  password: process.env.PGPASSWORD || "root",
  database: process.env.PGDATABASE || "file-sharing",
  entities: ['dist/**/*entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  migrationsRun: false,
  synchronize: true,
  logging: ['warn', 'error'],
  // ssl: false,
  ssl: {
    rejectUnauthorized: false,
  },
};

export const dataSourse = new DataSource(dataSourceOptionst);
