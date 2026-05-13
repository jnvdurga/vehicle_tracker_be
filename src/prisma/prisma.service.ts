import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL must be defined for Prisma to connect.');
    }

    const pool = new Pool({
      connectionString,
      max: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    super({
      adapter: new PrismaPg(pool),
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    this.registerQueryLogging();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to DB');
    } catch (error) {
      this.logger.error('Prisma connection failed', (error as Error).stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from DB');
  }

  private registerQueryLogging() {
    const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS ?? '500', 10);

    (this.$on as (event: string, cb: (e: Prisma.QueryEvent) => void) => void)(
      'query',
      (e: Prisma.QueryEvent) => {
        if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
          this.logger.warn(`Slow query detected (${e.duration}ms): ${e.query}`);
        }
      },
    );

    (this.$on as (event: string, cb: (e: Prisma.LogEvent) => void) => void)(
      'warn',
      (e: Prisma.LogEvent) => {
        this.logger.warn(`Prisma warning: ${e.message}`);
      },
    );

    (this.$on as (event: string, cb: (e: Prisma.LogEvent) => void) => void)(
      'error',
      (e: Prisma.LogEvent) => {
        this.logger.error(`Prisma error: ${e.message}`);
      },
    );
  }
}
