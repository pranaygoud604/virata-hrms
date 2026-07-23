import { Body, Controller, Get, Header, Param, ParseEnumPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OfferStatus, Role } from '@prisma/client';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
@Controller('offers')
export class OffersController {
  constructor(private service: OffersService) {}

  @Post()
  create(@Body() dto: CreateOfferDto) {
    return this.service.create(dto);
  }

  @Patch(':id/status/:status')
  setStatus(@Param('id') id: string, @Param('status', new ParseEnumPipe(OfferStatus)) status: OfferStatus) {
    return this.service.setStatus(id, status);
  }

  @Get(':id/letter')
  @Header('Content-Type', 'text/plain')
  letter(@Param('id') id: string) {
    return this.service.letterText(id);
  }
}
