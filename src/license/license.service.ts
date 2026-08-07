import { systemConfig } from '@/config/app.config';
import { ResponseResult } from '@/interceptors/transform.interceptor';
import { HttpException, Inject, Injectable, InternalServerErrorException, Logger, OnModuleDestroy } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as chokidar from 'chokidar';
import { EventName, EVENTS } from 'chokidar/handler.js';
import { I18nService } from 'nestjs-i18n';
import crypto from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { catchError, defer, map, of } from 'rxjs';
import { decodeUnpaddedBase64UrlText, encodeBase64Url, encodeBase64UrlText } from '../utils/base64';
import { parseJsonObject, stringifyJson } from '../utils/json';
import { type IssueLicenseDto } from './dto/issue-license.dto';
import { licenseConfig } from './license.config';
import type { LicenseClaims } from './license.interfaces';
import { parseLicenseEnvelope, validateLicenseClaims, verifyLicense } from './utils/claims';
import { generateLicenseKeyPair, readLicensePrivateKey, readLicensePublicKey, writeLicensePrivateKey, writeLicensePublicKey } from './utils/key';
import { generateMachineId } from './utils/machine';

@Injectable()
export class LicenseService implements OnModuleDestroy {
  private readonly logger = new Logger(LicenseService.name);
  private readonly machineId: string | undefined;

  // 文件内容只在应用启动时加载一次，更换 License 文件后需要重启应用。
  private readonly licenseFileWatcher: chokidar.FSWatcher;
  private licenseSnapshot: { content: string | null; claims: LicenseClaims | null; isValid: boolean; message: string | null } = {
    content: null,
    claims: null,
    isValid: false,
    message: null,
  };

  constructor(
    @Inject(licenseConfig.KEY)
    private readonly licenseConfiguration: ConfigType<typeof licenseConfig>,
    @Inject(systemConfig.KEY)
    private readonly systemConfiguration: ConfigType<typeof systemConfig>,
    private readonly i18nService: I18nService,
  ) {
    try {
      this.machineId = generateMachineId(this.systemConfiguration.password);
      this.logger.log(`机器码：${this.machineId}`);
    } catch (error: unknown) {
      this.logger.error(`获取机器码失败 ${error instanceof Error ? error.message : String(error)}`);
    }
    // 初始化监听器
    this.licenseFileWatcher = chokidar.watch(this.licenseConfiguration.licenseFilePath, {
      persistent: true,
      ignoreInitial: true, // 忽略启动时的初始化事件
      awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
    });

    this.licenseFileWatcher
      .on('ready', () => this.refreshLicenseSnapshot())
      .on('all', (event) => {
        const licenseFileEvents: ReadonlyArray<EventName> = [EVENTS.ADD, EVENTS.CHANGE, EVENTS.UNLINK, EVENTS.UNLINK_DIR];
        if (licenseFileEvents.includes(event)) {
          this.refreshLicenseSnapshot();
        }
      })
      .on('error', (error) => console.error(`监听错误: ${error instanceof Error ? error.message : String(error)}`))
      .on('close', () => this.logger.log('触发 watcher close')); // 调用 watcher.close() 触发
  }

  onModuleDestroy() {
    void this.licenseFileWatcher.close();
  }

  private refreshLicenseSnapshot() {
    const licensePublicKey = readLicensePublicKey(this.licenseConfiguration.publicKeyPath);
    const { content, claims } = this.readLicenseFile();
    this.licenseSnapshot.claims = claims;
    try {
      const { valid } = verifyLicense(content ?? '', licensePublicKey, {
        machineId: this.machineId,
        product: this.licenseConfiguration.product,
        timestamp: Date.now(),
        audience: this.licenseConfiguration.audience,
        maxSize: this.licenseConfiguration.maxLicenseFileSize,
        customer: this.licenseConfiguration.customer,
      });
      this.licenseSnapshot.isValid = valid;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(errMsg);
      this.licenseSnapshot.isValid = false;
      this.licenseSnapshot.message = errMsg;
    }
  }

  /**
   * 获取 License 内容
   */
  private readLicenseFile() {
    let licenseClaims: LicenseClaims | null = null;
    let licenseContent: string | null = null;
    try {
      licenseContent = readFileSync(this.licenseConfiguration.licenseFilePath, 'utf8');
      const licenseEnvelope = parseLicenseEnvelope(licenseContent);
      const decodedClaims = decodeUnpaddedBase64UrlText(licenseEnvelope.payload, { allowEmpty: false, maxDecodedBytes: this.licenseConfiguration.maxLicenseFileSize });
      licenseClaims = parseJsonObject<LicenseClaims>(decodedClaims.toString(), { format: 'json5' });
      console.group('本地证书');
      Object.entries(licenseClaims).forEach(([k, v]) => console.log(`${k}: ${v}`));
      console.groupEnd();
    } catch (error) {
      this.logger.error(`读取 License 内容失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { content: licenseContent, claims: licenseClaims };
  }

  /**
   * 检查密钥对或公钥是否存在。
   */
  checkSigningKeys() {
    return defer(() => {
      const privateKeyStat = statSync(this.licenseConfiguration.privateKeyPath);
      const publicKeyStat = statSync(this.licenseConfiguration.publicKeyPath);
      if (privateKeyStat.isDirectory() || publicKeyStat.isDirectory()) {
        this.logger.error(`密钥路径不能是目录 ${this.licenseConfiguration.privateKeyPath} 或 ${this.licenseConfiguration.publicKeyPath}`);
        return of(false);
      }
      return of(true);
    }).pipe(
      catchError((error: unknown) => {
        this.logger.error(`检查密钥对或公钥是否存在失败: ${error instanceof Error ? error.message : String(error)}`);
        return of(false);
      }),
    );
  }

  /**
   * 生成 Ed25519 密钥对，并写入文件。已存在的文件会被覆盖。
   */
  generateSigningKeyPair() {
    return defer(() => {
      const { privateKeyPem, publicKeyPem } = generateLicenseKeyPair();
      writeLicensePrivateKey(this.licenseConfiguration.privateKeyPath, privateKeyPem, true);
      writeLicensePublicKey(this.licenseConfiguration.publicKeyPath, publicKeyPem, true);
      return of(ResponseResult.success(this.i18nService.t('license.KEY_PAIR_GENERATED')));
    }).pipe(
      catchError((error: unknown) => {
        this.logger.error(`检查密钥对或公钥是否存在失败: ${error instanceof Error ? error.message : String(error)}`);
        return of(false);
      }),
    );
  }

  getMachineId() {
    return of(this.machineId).pipe(
      map((v) => {
        if (!v) throw new InternalServerErrorException(this.i18nService.t('license.MACHINE_ID_NOT_FOUND'));
        return v;
      }),
      catchError((error: unknown) => {
        this.logger.error(`获取机器码失败: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof HttpException) throw error;
        throw new InternalServerErrorException(this.i18nService.t('license.MACHINE_ID_READ_FAILED'));
      }),
    );
  }

  /**
   * 获取 License 内容
   */
  getLicenseClaims() {
    return this.licenseSnapshot.claims;
  }

  /**
   * 签发 License
   */
  issueLicense(issueLicenseDto: IssueLicenseDto) {
    return defer(() => {
      const licenseClaims: LicenseClaims = {
        license_id: crypto.randomUUID(),
        customer: issueLicenseDto.customer,
        product: issueLicenseDto.product,
        edition: issueLicenseDto.edition,
        issued_at: issueLicenseDto.issued_at,
        issuer: issueLicenseDto.issuer,
        audience: issueLicenseDto.audience,
        not_before: issueLicenseDto.not_before,
        expires_at: issueLicenseDto.expires_at,
        machine_id: issueLicenseDto.machine_id,
      };

      const privateKey = readLicensePrivateKey(this.licenseConfiguration.privateKeyPath);
      const payloadBase64 = encodeBase64UrlText(stringifyJson(licenseClaims));
      const signature = crypto.sign(null, Buffer.from(payloadBase64, 'utf8'), privateKey);
      writeFileSync(this.licenseConfiguration.licenseFilePath, JSON.stringify({ payload: payloadBase64, signature: encodeBase64Url(signature) }, null, 2), 'utf8');
      return of(ResponseResult.success(this.i18nService.t('license.LICENSE_ISSUED')));
    }).pipe(
      catchError((error: unknown) => {
        this.logger.error(`License 签发失败: ${error instanceof Error ? error.message : String(error)}`);
        throw new InternalServerErrorException(this.i18nService.t('license.ISSUE_FAILED'));
      }),
    );
  }

  /**
   * 返回当前 License 状态。文件和签名不重复加载，但有效期会按当前时间重新检查。
   */
  isLicenseValid() {
    const { isValid, claims, message } = this.licenseSnapshot;
    if (!isValid || !claims) return { status: false, message };
    try {
      validateLicenseClaims(claims, {
        currentTimestamp: Date.now(),
        currentMachineId: this.machineId,
        expectedProduct: this.licenseConfiguration.product,
        expectedAudience: this.licenseConfiguration.audience,
        expectedCustomer: this.licenseConfiguration.customer,
      });
      return { status: true };
    } catch (error: unknown) {
      return { status: false, message: error instanceof Error ? error.message : String(error) };
    }
  }
}
