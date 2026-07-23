import { Injectable, NotFoundException } from '@nestjs/common';
import { CandidateStage, OfferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOfferDto) {
    const [offer] = await this.prisma.$transaction([
      this.prisma.offer.create({ data: dto }),
      this.prisma.candidate.update({
        where: { id: dto.candidateId },
        data: { stage: CandidateStage.OFFER },
      }),
    ]);
    return offer;
  }

  async setStatus(id: string, status: OfferStatus) {
    const offer = await this.prisma.offer.update({ where: { id }, data: { status } });
    if (status === OfferStatus.ACCEPTED) {
      await this.prisma.candidate.update({
        where: { id: offer.candidateId },
        data: { stage: CandidateStage.HIRED },
      });
    } else if (status === OfferStatus.DECLINED) {
      await this.prisma.candidate.update({
        where: { id: offer.candidateId },
        data: { stage: CandidateStage.REJECTED },
      });
    }
    return offer;
  }

  async letterText(id: string): Promise<string> {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: { candidate: true, designation: { include: { department: true } } },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    const joining = offer.joiningDate ? offer.joiningDate.toDateString() : 'a date to be mutually agreed';
    return [
      'OFFER OF EMPLOYMENT',
      '',
      `Date: ${offer.offeredAt.toDateString()}`,
      '',
      `Dear ${offer.candidate.fullName},`,
      '',
      `We are pleased to offer you the position of ${offer.designation.title} in the ${offer.designation.department.name} team.`,
      '',
      `Proposed annual compensation: ₹${offer.proposedSalary.toLocaleString('en-IN')}`,
      `Proposed joining date: ${joining}`,
      '',
      'This letter is a summary offer and does not constitute a full employment contract. Detailed terms will follow in your formal appointment letter upon acceptance.',
      '',
      'We look forward to welcoming you to the team.',
    ].join('\n');
  }
}
