import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateJobPostingDto {
  @ApiProperty({ example: 'Senior Site Engineer' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  designationId?: string;

  @ApiProperty({ example: 'Own execution of interior fit-out projects end to end.' })
  @IsString()
  description: string;
}
