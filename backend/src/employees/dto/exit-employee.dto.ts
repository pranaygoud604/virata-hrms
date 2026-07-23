import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class ExitEmployeeDto {
  @ApiProperty({ example: '2026-09-15' })
  @Type(() => Date)
  @IsDate()
  dateOfExit: Date;
}
