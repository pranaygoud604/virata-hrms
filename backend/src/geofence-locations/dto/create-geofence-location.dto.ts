import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGeoFenceLocationDto {
  @ApiProperty({ example: 'Head Office — Banjara Hills' })
  @IsString()
  name: string;

  @ApiProperty({ example: 17.4126 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 78.4482 })
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ example: 200, description: 'Allowed check-in radius, in meters' })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(5000)
  radiusMeters?: number;
}
