import {
  IsString,
  IsNumber,
  Min,
  Length,
  IsNotEmpty,
  NotEquals,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class TradeDto {
  @ApiProperty({ example: 'NGN', description: 'Source Currency Code (Sell)' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @Transform(({ value }) => value.toUpperCase())
  fromCurrency: string;

  @ApiProperty({ example: 'USD', description: 'Target Currency Code (Buy)' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @Transform(({ value }) => value.toUpperCase())
  @NotEquals('fromCurrency', { message: 'Cannot trade the same currency' })
  toCurrency: string;

  @ApiProperty({ example: 5000.0, description: 'Amount to sell' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(1)
  amount: number;
}
