import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { IsReasonableDate } from '../../common/validators/is-reasonable-date';

export class ApplyLeaveDto {
  @ApiProperty()
  @IsUUID()
  leaveTypeId: string;

  @ApiProperty({ example: '2026-08-10' })
  @Type(() => Date)
  @IsDate()
  @IsReasonableDate()
  startDate: Date;

  @ApiProperty({ example: '2026-08-12' })
  @Type(() => Date)
  @IsDate()
  @IsReasonableDate()
  endDate: Date;

  @ApiPropertyOptional({ example: false, description: 'Only valid when startDate equals endDate' })
  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;

  @ApiProperty({ example: 'Family function out of town' })
  @IsString()
  @MinLength(3)
  reason: string;
}
