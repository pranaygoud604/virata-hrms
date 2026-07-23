import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateGoalDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty()
  @IsUUID()
  cycleId: string;

  @ApiProperty({ example: 'Ship the client portal redesign' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 25, description: 'Weight within the cycle, 0-100' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weightPercent?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional({ example: '%' })
  @IsOptional()
  @IsString()
  metricUnit?: string;
}
