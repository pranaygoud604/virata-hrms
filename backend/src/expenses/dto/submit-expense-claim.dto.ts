import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDate, IsNumber, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';

export class SubmitExpenseClaimDto {
  @ApiProperty({ example: 'Travel' })
  @IsString()
  category: string;

  @ApiProperty({ example: 1450.5 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'Cab fare — client site visit' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @ApiProperty({ example: '2026-07-18' })
  @Type(() => Date)
  @IsDate()
  expenseDate: Date;

  @ApiPropertyOptional({
    type: [String],
    description: 'Receipt file URLs — this API does not handle upload itself; upload to object storage first and pass the resulting URL(s).',
    example: ['https://storage.example.com/receipts/abc123.jpg'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl({}, { each: true })
  receiptUrls?: string[];
}
