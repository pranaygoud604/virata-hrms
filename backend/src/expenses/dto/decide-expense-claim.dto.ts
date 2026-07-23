import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DecideExpenseClaimDto {
  @ApiPropertyOptional({ example: 'Approved — within policy limit.' })
  @IsOptional()
  @IsString()
  note?: string;
}
