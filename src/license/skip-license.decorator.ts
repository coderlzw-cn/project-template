import { SetMetadata } from '@nestjs/common';

export const SKIP_LICENSE_KEY = 'skipLicense';

export const SkipLicenseCheck = () => SetMetadata(SKIP_LICENSE_KEY, true);
