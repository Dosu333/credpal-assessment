import { IsString, IsNumber, Min, Length, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';

export class ConvertCurrencyDto {
  @ApiProperty({ example: 'USD', description: 'Source Currency' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @Transform(({ value }) => value.toUpperCase())
  from: string;

  @ApiProperty({ example: 'NGN', description: 'Target Currency' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @Transform(({ value }) => value.toUpperCase())
  to: string;

  @ApiProperty({ example: 100, description: 'Amount to convert' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;
}
