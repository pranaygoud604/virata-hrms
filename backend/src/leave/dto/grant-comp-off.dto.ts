import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class GrantCompOffDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty({ example: '2026-08-09', description: 'The holiday/weekly-off date actually worked' })
  @Type(() => Date)
  @IsDate()
  earnedForDate: Date;

  @ApiPropertyOptional({ example: 90, description: 'Days until this credit expires (default 90)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInDays?: number;
}
