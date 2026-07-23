import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class CreateCycleDto {
  @ApiProperty({ example: 'H2 2026' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2026-07-01' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ example: '2026-12-31' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;
}
