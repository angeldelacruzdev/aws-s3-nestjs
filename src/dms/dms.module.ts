import { Module } from '@nestjs/common';
import { DmsService } from './dms.service';
import { DmsController } from './dms.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [DmsService],
  controllers: [DmsController],
  imports: [ConfigModule],
})
export class DmsModule {}
