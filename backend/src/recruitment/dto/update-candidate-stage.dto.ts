import { ApiProperty } from '@nestjs/swagger';
import { CandidateStage } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCandidateStageDto {
  @ApiProperty({ enum: CandidateStage })
  @IsEnum(CandidateStage)
  stage: CandidateStage;
}
