import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateDesignationDto {
  @ApiProperty({ example: 'Site Supervisor' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsUUID()
  departmentId: string;
}
