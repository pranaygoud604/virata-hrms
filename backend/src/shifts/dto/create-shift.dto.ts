import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateShiftDto {
  @ApiProperty({ example: 'General Shift' })
  @IsString()
  name: string;

  @ApiProperty({ example: '09:30', description: '24-hour local time' })
  @Matches(HHMM, { message: 'startTime must be in HH:MM 24-hour format' })
  startTime: string;

  @ApiProperty({ example: '18:30', description: '24-hour local time' })
  @Matches(HHMM, { message: 'endTime must be in HH:MM 24-hour format' })
  endTime: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodMinutes?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isNightShift?: boolean;
}
