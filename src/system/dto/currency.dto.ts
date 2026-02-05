import { IsString, IsBoolean, IsNotEmpty, Length, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'KES', description: 'ISO 4217 Code' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @Transform(({ value }) => value.toUpperCase())
  code: string;

  @ApiProperty({ example: 'Kenyan Shilling' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 2, default: 2 })
  @IsInt()
  @Min(0)
  decimalPlaces: number;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive: boolean;

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isCrypto: boolean;
}