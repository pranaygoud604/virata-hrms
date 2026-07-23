import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DecideLeaveDto {
  @ApiPropertyOptional({ example: 'Approved, enjoy the trip.' })
  @IsOptional()
  @IsString()
  note?: string;
}
