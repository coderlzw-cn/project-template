import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LicenseService } from './license.service';
import { Public } from '../decorators/public.decorator';

@Public()
@ApiTags('license')
@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get('status')
  status() {
    return false;
  }
}
