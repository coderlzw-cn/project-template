import { systemConfig } from '@/config/app.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { licenseConfig } from './license.config';
import { LicenseController } from './license.controller';
import { LicenseGuard } from './license.guard';
import { LicenseService } from './license.service';

@Module({
  imports: [ConfigModule.forFeature(licenseConfig), ConfigModule.forFeature(systemConfig)],
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
