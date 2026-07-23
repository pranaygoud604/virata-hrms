import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('performance-reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance-reviews')
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Post('self')
  submitSelf(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitReviewDto) {
    return this.service.submitSelfReview(user, dto);
  }

  @Post('manager')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN)
  submitManager(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitReviewDto) {
    return this.service.submitManagerReview(user, dto);
  }

  @Get('employee/:employeeId/cycle/:cycleId')
  forEmployeeInCycle(@Param('employeeId') employeeId: string, @Param('cycleId') cycleId: string) {
    return this.service.forEmployeeInCycle(employeeId, cycleId);
  }
}
