import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LicenseController } from './license.controller';
import { LicenseGuard } from './license.guard';
import { LicenseService } from './license.service';
import { Module } from '@nestjs/common';
import { licenseConfig } from '../config/app.config';

@Module({
  imports: [ConfigModule.forFeature(licenseConfig)],
  controllers: [LicenseController],
  providers: [
    LicenseService,
    {
      provide: APP_GUARD,
      useClass: LicenseGuard,
    },
  ],
  exports: [LicenseService],
})
export class LicenseModule {}
