import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateStageDto } from './dto/update-candidate-stage.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('candidates')
@Controller('candidates')
export class CandidatesController {
  constructor(private service: CandidatesService) {}

  // Intentionally public — candidates apply without an account.
  @Post()
  apply(@Body() dto: CreateCandidateDto) {
    return this.service.apply(dto);
  }

  @Get('job-posting/:jobPostingId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER)
  forJobPosting(@Param('jobPostingId') jobPostingId: string) {
    return this.service.forJobPosting(jobPostingId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/stage')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER)
  updateStage(@Param('id') id: string, @Body() dto: UpdateCandidateStageDto) {
    return this.service.updateStage(id, dto);
  }
}
