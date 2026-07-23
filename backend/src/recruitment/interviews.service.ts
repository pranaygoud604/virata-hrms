import { Injectable } from '@nestjs/common';
import { CandidateStage, InterviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { SubmitInterviewFeedbackDto } from './dto/submit-interview-feedback.dto';

@Injectable()
export class InterviewsService {
  constructor(private prisma: PrismaService) {}

  async schedule(dto: ScheduleInterviewDto) {
    const [interview] = await this.prisma.$transaction([
      this.prisma.interview.create({ data: dto }),
      this.prisma.candidate.update({
        where: { id: dto.candidateId },
        data: { stage: CandidateStage.INTERVIEW },
      }),
    ]);
    return interview;
  }

  submitFeedback(id: string, dto: SubmitInterviewFeedbackDto) {
    return this.prisma.interview.update({
      where: { id },
      data: { status: InterviewStatus.COMPLETED, rating: dto.rating, feedback: dto.feedback },
    });
  }

  forCandidate(candidateId: string) {
    return this.prisma.interview.findMany({
      where: { candidateId },
      include: { interviewer: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  forInterviewer(interviewerId: string) {
    return this.prisma.interview.findMany({
      where: { interviewerId, status: InterviewStatus.SCHEDULED },
      include: { candidate: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}
