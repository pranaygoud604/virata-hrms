import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude } from 'class-validator';

export class CheckInDto {
  @ApiProperty({ example: 17.4126 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 78.4482 })
  @IsLongitude()
  longitude: number;
}
