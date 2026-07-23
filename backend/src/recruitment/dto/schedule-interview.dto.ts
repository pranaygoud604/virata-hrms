import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InterviewMode } from '@prisma/client';
import { IsDate, IsEnum, IsUUID } from 'class-validator';

export class ScheduleInterviewDto {
  @ApiProperty()
  @IsUUID()
  candidateId: string;

  @ApiProperty()
  @IsUUID()
  interviewerId: string;

  @ApiProperty({ example: '2026-08-05T10:30:00Z' })
  @Type(() => Date)
  @IsDate()
  scheduledAt: Date;

  @ApiProperty({ enum: InterviewMode, example: InterviewMode.VIDEO })
  @IsEnum(InterviewMode)
  mode: InterviewMode;
}
