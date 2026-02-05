import { IsString, IsNumber, Min, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
  @ApiProperty({ example: 5000.0, description: 'Amount to fund' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(10)
  amount: number;

  @ApiProperty({ example: 'NGN', description: 'Currency Code' })
  @IsString()
  @Length(3, 3)
  currency: string;
}
