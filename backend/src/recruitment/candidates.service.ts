import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateStageDto } from './dto/update-candidate-stage.dto';

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  apply(dto: CreateCandidateDto) {
    return this.prisma.candidate.create({ data: dto });
  }

  forJobPosting(jobPostingId: string) {
    return this.prisma.candidate.findMany({
      where: { jobPostingId },
      include: { interviews: true, offer: true },
      orderBy: { appliedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.candidate.findUniqueOrThrow({
      where: { id },
      include: { interviews: true, offer: true, jobPosting: true },
    });
  }

  updateStage(id: string, dto: UpdateCandidateStageDto) {
    return this.prisma.candidate.update({ where: { id }, data: { stage: dto.stage } });
  }
}
