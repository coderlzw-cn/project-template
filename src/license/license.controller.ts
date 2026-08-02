import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { IssueLicenseDto } from './dto/issue-license.dto';
import { LicenseService } from './license.service';
import { SkipLicenseCheck } from './skip-license.decorator';

@Public()
@SkipLicenseCheck()
@ApiTags('license')
@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @ApiOperation({ summary: '检查密钥对或公钥是否存在' })
  @Get('key-exists')
  checkSigningKeys() {
    return this.licenseService.checkSigningKeys();
  }

  @ApiOperation({ summary: '生成密钥对' })
  @Get('key-pair')
  generateSigningKeyPair() {
    return this.licenseService.generateSigningKeyPair();
  }

  @ApiOperation({ summary: '获取机器码' })
  @Get('machine-code')
  getMachineId() {
    return this.licenseService.getMachineId();
  }

  @ApiOperation({ summary: '签发 License' })
  @Post('issue')
  issueLicense(@Body() issueLicenseDto: IssueLicenseDto) {
    return this.licenseService.issueLicense(issueLicenseDto);
  }

  @ApiOperation({ summary: '获取 License 声明内容' })
  @Get('claims')
  getLicenseClaims() {
    return this.licenseService.getLicenseClaims();
  }

  @ApiOperation({ summary: '检测 License' })
  @Get('status')
  isLicenseValid() {
    return this.licenseService.isLicenseValid();
  }
}
