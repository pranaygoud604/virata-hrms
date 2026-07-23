import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JobPostingStatus, Role } from '@prisma/client';
import { JobPostingsService } from './job-postings.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('job-postings')
@Controller('job-postings')
export class JobPostingsController {
  constructor(private service: JobPostingsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  create(@Body() dto: CreateJobPostingDto) {
    return this.service.create(dto);
  }

  // Intentionally public — this is the careers-page listing. Candidates don't
  // have accounts, so browsing open roles cannot require a Bearer token.
  @Get()
  findAll(@Query('status') status?: JobPostingStatus) {
    // Default to OPEN only when no status is given, so the public careers
    // page doesn't leak closed/on-hold postings by default.
    return this.service.findAll(status ?? JobPostingStatus.OPEN);
  }

  @Patch(':id/status/:status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  setStatus(
    @Param('id') id: string,
    @Param('status', new ParseEnumPipe(JobPostingStatus)) status: JobPostingStatus,
  ) {
    return this.service.setStatus(id, status);
  }
}
