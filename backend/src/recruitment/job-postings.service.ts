import { Injectable } from '@nestjs/common';
import { JobPostingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';

@Injectable()
export class JobPostingsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateJobPostingDto) {
    return this.prisma.jobPosting.create({ data: dto });
  }

  findAll(status?: JobPostingStatus) {
    return this.prisma.jobPosting.findMany({
      where: status ? { status } : undefined,
      include: { department: true, designation: true, _count: { select: { candidates: true } } },
      orderBy: { postedAt: 'desc' },
    });
  }

  setStatus(id: string, status: JobPostingStatus) {
    return this.prisma.jobPosting.update({
      where: { id },
      data: { status, closedAt: status === JobPostingStatus.CLOSED ? new Date() : undefined },
    });
  }
}
