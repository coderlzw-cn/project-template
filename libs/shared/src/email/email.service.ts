import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';
import type * as Mail from 'nodemailer/lib/mailer';
import type { EmailModuleOptions, SendEmailOptions, SentMessageInfo } from './email.interface';
import { MODULE_OPTIONS_TOKEN } from './email.module-definition';

/**
 * 类型守卫：检查对象是否有 messageId 属性
 */
function hasMessageId(value: unknown): value is { messageId: unknown } {
  return typeof value === 'object' && value !== null && 'messageId' in value;
}

/**
 * 类型守卫：检查值是否为有效的 SentMessageInfo
 */
function isSentMessageInfo(value: unknown): value is SentMessageInfo {
  if (!hasMessageId(value)) {
    return false;
  }
  return typeof value.messageId === 'string';
}

/**
 * 安全地获取 messageId
 */
function getMessageId(value: unknown): string {
  if (hasMessageId(value)) {
    const messageId = value.messageId;
    if (typeof messageId === 'string') {
      return messageId;
    }
    if (typeof messageId === 'number' || typeof messageId === 'boolean') {
      return String(messageId);
    }
  }
  return 'unknown';
}

/**
 * 类型守卫：检查对象是否有 address 属性
 */
function hasAddress(value: unknown): value is { address: unknown } {
  return typeof value === 'object' && value !== null && 'address' in value;
}

/**
 * 类型守卫：检查值是否为 Address 类型
 */
function isAddress(value: unknown): value is Mail.Address {
  if (!hasAddress(value)) {
    return false;
  }
  return typeof value.address === 'string';
}

/**
 * 类型守卫：检查值是否为 Address 或字符串
 */
function isAddressOrString(value: unknown): value is string | Mail.Address {
  return typeof value === 'string' || isAddress(value);
}

/**
 * 安全地转换数组为 Address 或字符串数组
 */
function normalizeAddressArray(value: unknown): Array<string | Mail.Address> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isAddressOrString);
}

/**
 * 将 nodemailer 返回的结果转换为 SentMessageInfo
 */
function normalizeSentMessageInfo(result: unknown): SentMessageInfo {
  if (isSentMessageInfo(result)) {
    return result;
  }

  const messageId = getMessageId(result);
  const accepted = hasProperty(result, 'accepted') ? normalizeAddressArray(result.accepted) : [];
  const rejected = hasProperty(result, 'rejected') ? normalizeAddressArray(result.rejected) : [];
  const pending = hasProperty(result, 'pending') ? normalizeAddressArray(result.pending) : [];
  const response = hasProperty(result, 'response') && typeof result.response === 'string' ? result.response : '';

  return {
    messageId,
    accepted,
    rejected,
    pending,
    response,
  };
}

/**
 * 类型守卫：检查对象是否有指定属性
 */
function hasProperty<K extends string>(value: unknown, key: K): value is { [P in K]: unknown } {
  return typeof value === 'object' && value !== null && key in value;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private defaultFrom = '';

  constructor(@Inject(MODULE_OPTIONS_TOKEN) @Optional() private readonly options: EmailModuleOptions) {
    this.initTransporter();
  }

  /**
   * 初始化邮件传输器
   */
  private initTransporter() {
    try {
      const { from, fromName, ...transportOptions } = this.options;
      this.transporter = nodemailer.createTransport(transportOptions);

      const fromEmail = from ?? this.options.auth?.user ?? '';
      if (fromName && fromEmail) {
        this.defaultFrom = `"${fromName}" <${fromEmail}>`;
      } else {
        this.defaultFrom = fromEmail;
      }

      this.logger.log(`Email transporter initialized: ${this.options.host}:${this.options.port}`);
    } catch (error) {
      this.logger.error(`Failed to initialize email transporter: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取邮件传输器实例
   */
  getTransporter() {
    if (!this.transporter) {
      throw new Error('Email transporter is not initialized. Please configure the Email module first.');
    }
    return this.transporter;
  }

  /**
   * 验证邮件配置
   */
  async verifyConnection() {
    try {
      await this.getTransporter().verify();
      this.logger.log('Email transporter connection verified');
      return true;
    } catch (error) {
      this.logger.error(`Email transporter verification failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * 发送邮件
   * @param options 邮件发送选项
   */
  async sendEmail(options: SendEmailOptions): Promise<SentMessageInfo> {
    try {
      const mailOptions: SendMailOptions = {
        from: options.from ?? this.defaultFrom,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        replyTo: options.replyTo,
      };

      const rawResult: unknown = await this.getTransporter().sendMail(mailOptions);
      const normalizedResult = normalizeSentMessageInfo(rawResult);
      const toAddresses = Array.isArray(options.to) ? options.to.join(', ') : options.to;
      this.logger.log(`Email sent successfully to ${toAddresses}. MessageId: ${normalizedResult.messageId}`);
      return normalizedResult;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 发送纯文本邮件
   * @param to 收件人邮箱地址（可以是多个）
   * @param subject 邮件主题
   * @param text 邮件正文
   * @param options 其他选项
   */
  async sendTextEmail(to: string | string[], subject: string, text: string, options?: Omit<SendEmailOptions, 'to' | 'subject' | 'text'>) {
    return this.sendEmail({
      to,
      subject,
      text,
      ...options,
    });
  }

  /**
   * 发送HTML邮件
   * @param to 收件人邮箱地址（可以是多个）
   * @param subject 邮件主题
   * @param html HTML邮件正文
   * @param options 其他选项
   */
  async sendHtmlEmail(to: string | string[], subject: string, html: string, options?: Omit<SendEmailOptions, 'to' | 'subject' | 'html'>) {
    return this.sendEmail({
      to,
      subject,
      html,
      ...options,
    });
  }

  /**
   * 发送带附件的邮件
   * @param to 收件人邮箱地址（可以是多个）
   * @param subject 邮件主题
   * @param content 邮件正文（可以是文本或HTML）
   * @param attachments 附件列表
   * @param options 其他选项
   */
  async sendEmailWithAttachments(
    to: string | string[],
    subject: string,
    content: { text?: string; html?: string },
    attachments: SendEmailOptions['attachments'],
    options?: Omit<SendEmailOptions, 'to' | 'subject' | 'text' | 'html' | 'attachments'>,
  ) {
    return this.sendEmail({
      to,
      subject,
      text: content.text,
      html: content.html,
      attachments,
      ...options,
    });
  }
}
