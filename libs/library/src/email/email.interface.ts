import type * as Mail from 'nodemailer/lib/mailer';
import type * as SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * 邮件模块配置选项
 */
export interface EmailModuleOptions extends Omit<SMTPTransport.Options, 'from'> {
  /** 默认发件人地址 */
  from?: string;
  /** 默认发件人名称 */
  fromName?: string;
  /** 是否全局模块 */
  isGlobal?: boolean;
}

/**
 * 邮件发送选项（简化版，基于 nodemailer Mail.Options）
 */
export interface SendEmailOptions {
  /** 收件人邮箱地址（可以是多个） */
  to: string | string[];
  /** 抄送邮箱地址（可选） */
  cc?: string | string[];
  /** 密送邮箱地址（可选） */
  bcc?: string | string[];
  /** 邮件主题 */
  subject: string;
  /** 邮件正文（文本格式） */
  text?: string;
  /** 邮件正文（HTML格式） */
  html?: string;
  /** 附件（可选） */
  attachments?: Mail.Attachment[];
  /** 回复地址（可选） */
  replyTo?: string;
  /** 发件人地址（可选，覆盖默认值） */
  from?: string;
}

/**
 * 邮件发送结果信息
 */
export interface SentMessageInfo {
  /** 消息 ID */
  messageId: string;
  /** 接受的收件人 */
  accepted: Array<string | Mail.Address>;
  /** 拒绝的收件人 */
  rejected: Array<string | Mail.Address>;
  /** 待处理的收件人 */
  pending: Array<string | Mail.Address>;
  /** 响应信息 */
  response: string;
}
