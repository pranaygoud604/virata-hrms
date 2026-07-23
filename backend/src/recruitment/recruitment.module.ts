import { Module } from '@nestjs/common';
import { JobPostingsController } from './job-postings.controller';
import { JobPostingsService } from './job-postings.service';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  controllers: [JobPostingsController, CandidatesController, InterviewsController, OffersController],
  providers: [JobPostingsService, CandidatesService, InterviewsService, OffersService],
})
export class RecruitmentModule {}
