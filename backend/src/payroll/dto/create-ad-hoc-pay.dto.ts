import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { AdHocPayType } from '@prisma/client';

export class CreateAdHocPayDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty({ enum: AdHocPayType, example: AdHocPayType.BONUS })
  @IsEnum(AdHocPayType)
  type: AdHocPayType;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'Diwali bonus' })
  @IsOptional()
  @IsString()
  description?: string;
}
