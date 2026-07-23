import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class UpsertBankDetailDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty({ example: 'Asha Rao' })
  @IsString()
  accountHolderName: string;

  @ApiProperty({ example: '123456789012' })
  @IsString()
  @MinLength(6)
  accountNumber: string;

  @ApiProperty({ example: 'HDFC0001234' })
  @IsString()
  ifscCode: string;

  @ApiProperty({ example: 'HDFC Bank' })
  @IsString()
  bankName: string;
}
