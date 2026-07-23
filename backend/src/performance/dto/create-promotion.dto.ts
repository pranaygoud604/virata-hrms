import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePromotionDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty()
  @IsUUID()
  newDesignationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cycleId?: string;

  @ApiProperty({ example: '2026-08-01' })
  @Type(() => Date)
  @IsDate()
  effectiveDate: Date;

  @ApiPropertyOptional({ example: 'Strong H2 performance, expanded scope' })
  @IsOptional()
  @IsString()
  note?: string;
}
