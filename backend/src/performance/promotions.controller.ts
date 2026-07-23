import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
@Controller('promotions')
export class PromotionsController {
  constructor(private service: PromotionsService) {}

  @Post()
  promote(@Body() dto: CreatePromotionDto) {
    return this.service.promote(dto);
  }

  @Get('employee/:employeeId')
  historyFor(@Param('employeeId') employeeId: string) {
    return this.service.historyFor(employeeId);
  }
}
