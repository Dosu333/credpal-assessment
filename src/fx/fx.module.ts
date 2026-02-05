import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { FxService } from './fx.service';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      ttl: 60 * 1000, // Cache for 60 seconds
      max: 100, // Max 100 items in memory
    }),
  ],
  providers: [FxService],
  exports: [FxService],
})
export class FxModule {}