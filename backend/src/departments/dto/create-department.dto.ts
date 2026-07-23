import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Site Operations' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Parent department id, for sub-departments' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
