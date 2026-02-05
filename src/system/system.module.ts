import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { Currency } from './entities/currency.entity';

@Module({
  imports: [
      TypeOrmModule.forFeature([
        Currency 
      ]), 
    ],
  providers: [SystemService],
  controllers: [SystemController],
  exports: [
    SystemService, 
    TypeOrmModule,
  ],
})
export class SystemModule {}
