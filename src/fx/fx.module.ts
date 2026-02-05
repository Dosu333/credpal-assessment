import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { Currency } from 'src/system/entities/currency.entity';
import { FxService } from './fx.service';
import { FxController } from './fx.controller';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Currency]),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        ttl: 3600,
      }),
    }),
  ],
  providers: [FxService],
  exports: [FxService],
  controllers: [FxController],
})
export class FxModule {}
