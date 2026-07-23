import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, MinLength } from 'class-validator';

export class CorrectionRequestDto {
  @ApiProperty({ example: '2026-07-20' })
  @Type(() => Date)
  @IsDate()
  date: Date;

  @ApiProperty({ example: 'Forgot to check out — left site at 6:45pm.' })
  @IsString()
  @MinLength(5)
  note: string;
}
