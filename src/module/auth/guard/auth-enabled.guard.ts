import { CanActivate, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { authJwtConfig } from '../../../config/jwt.config';

@Injectable()
export class AuthEnabledGuard implements CanActivate {
  constructor(
    @Inject(authJwtConfig.KEY)
    private readonly config: ConfigType<typeof authJwtConfig>,
    private readonly i18nService: I18nService,
  ) {}

  canActivate() {
    if (!this.config.enabled) {
      throw new NotFoundException(this.i18nService.t(`common.HTTP_ERROR.${HttpStatus.NOT_FOUND}`, { lang: I18nContext.current()?.lang }));
    }
    return true;
  }
}
