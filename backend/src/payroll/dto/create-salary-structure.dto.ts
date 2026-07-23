import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateSalaryStructureDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty({ example: '2026-08-01' })
  @Type(() => Date)
  @IsDate()
  effectiveFrom: Date;

  @ApiProperty({ example: 30000 })
  @IsNumber()
  @Min(0)
  basic: number;

  @ApiProperty({ example: 12000 })
  @IsNumber()
  @Min(0)
  hra: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  specialAllowance?: number;
}
