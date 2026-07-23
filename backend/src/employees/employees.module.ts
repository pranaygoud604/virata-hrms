import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeCodeService } from './employee-code.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeeCodeService],
  exports: [EmployeesService, EmployeeCodeService],
})
export class EmployeesModule {}
