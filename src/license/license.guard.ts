import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { LicenseService } from './license.service';
import { SKIP_LICENSE_KEY } from './skip-license.decorator';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly licenseService: LicenseService,
    private readonly i18nService: I18nService,
  ) {}

  canActivate(context: ExecutionContext) {
    const shouldSkipLicenseCheck = this.reflector.getAllAndOverride<boolean>(SKIP_LICENSE_KEY, [context.getHandler(), context.getClass()]);
    if (shouldSkipLicenseCheck) return true;

    const isLicenseValid = this.licenseService.isLicenseValid();

    if (isLicenseValid.status) return true;

    throw new ServiceUnavailableException({
      // 具体校验失败原因只写服务端日志，避免向客户端暴露机器码、文件路径或签名细节。
      message: this.i18nService.t('license.UNAVAILABLE'),
    });
  }
}
