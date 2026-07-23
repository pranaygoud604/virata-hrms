import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateOfferDto {
  @ApiProperty()
  @IsUUID()
  candidateId: string;

  @ApiProperty()
  @IsUUID()
  designationId: string;

  @ApiProperty({ example: 480000, description: 'Annual proposed salary (CTC)' })
  @IsNumber()
  @Min(0)
  proposedSalary: number;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  joiningDate?: Date;
}
