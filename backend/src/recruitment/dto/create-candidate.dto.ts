import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class CreateCandidateDto {
  @ApiProperty()
  @IsUUID()
  jobPostingId: string;

  @ApiProperty({ example: 'Ravi Teja' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'ravi.teja@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+91 90000 00001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'URL to the uploaded resume — this API does not handle upload itself.' })
  @IsOptional()
  @IsUrl()
  resumeUrl?: string;
}
