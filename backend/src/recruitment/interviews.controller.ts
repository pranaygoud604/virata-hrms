import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InterviewsService } from './interviews.service';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { SubmitInterviewFeedbackDto } from './dto/submit-interview-feedback.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

function requireEmployeeId(user: AuthenticatedUser): string {
  if (!user.employeeId) {
    throw new ForbiddenException('This account is not linked to an employee record');
  }
  return user.employeeId;
}

@ApiTags('interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private service: InterviewsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  schedule(@Body() dto: ScheduleInterviewDto) {
    return this.service.schedule(dto);
  }

  @Patch(':id/feedback')
  submitFeedback(@Param('id') id: string, @Body() dto: SubmitInterviewFeedbackDto) {
    return this.service.submitFeedback(id, dto);
  }

  @Get('candidate/:candidateId')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER)
  forCandidate(@Param('candidateId') candidateId: string) {
    return this.service.forCandidate(candidateId);
  }

  @Get('me')
  myUpcoming(@CurrentUser() user: AuthenticatedUser) {
    return this.service.forInterviewer(requireEmployeeId(user));
  }
}
