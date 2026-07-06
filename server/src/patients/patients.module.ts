import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RbacGuard } from '../common/rbac';

@Module({
  imports: [JwtModule.register({})],
  controllers: [PatientsController],
  providers: [PatientsService, JwtAuthGuard, RbacGuard],
})
export class PatientsModule {}
