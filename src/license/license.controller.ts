import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { LicenseService } from './license.service';

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
