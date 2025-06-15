import { Module } from '@nestjs/common';

import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';

import { DatabaseModule } from '@/database/database.module';
import { PaginationModule } from '@/pagination/pagination.module';

@Module({
  imports: [DatabaseModule, PaginationModule],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}
