import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService extends PrismaClient {
  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    const pool = new Pool({ connectionString });

    super({
      adapter: new PrismaPg(pool),
    });
  }
}
