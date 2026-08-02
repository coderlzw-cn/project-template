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
    const skipLicense = this.reflector.getAllAndOverride<boolean>(SKIP_LICENSE_KEY, [context.getHandler(), context.getClass()]);
    if (skipLicense) return true;

    const status = this.licenseService.getStatus();

    if (status.valid) return true;

    throw new ServiceUnavailableException({
      code: 'LICENSE_UNAVAILABLE',
      message: 'Application License is unavailable',
      state: status.state,
    });
  }
}
