import { Module } from '@nestjs/common';

import { DanceController } from './dance.controller';
import { DanceService } from './dance.service';

@Module({
  controllers: [DanceController],
  providers: [DanceService],
  exports: [DanceService],
})
export class DanceModule {}
