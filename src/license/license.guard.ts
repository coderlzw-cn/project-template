import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LicenseService } from './license.service';
import { SKIP_LICENSE_KEY } from './skip-license.decorator';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly licenseService: LicenseService,
  ) {}

  canActivate(context: ExecutionContext) {
    const shouldSkipLicenseCheck = this.reflector.getAllAndOverride<boolean>(SKIP_LICENSE_KEY, [context.getHandler(), context.getClass()]);
    if (shouldSkipLicenseCheck) return true;

    const isLicenseValid = this.licenseService.isLicenseValid();

    if (isLicenseValid.status) return true;

    throw new ServiceUnavailableException({
      message: isLicenseValid.message ?? '许可证不可用',
    });
  }
}
