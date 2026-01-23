# Email Module

邮件发送模块，基于 `nodemailer` 封装。

## 安装

确保已安装 `nodemailer` 依赖：

```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

## 使用方法

### 1. 在模块中导入

```typescript
import { EmailModule } from '@app/library/email';

@Module({
  imports: [
    EmailModule.forRoot({
      host: 'smtp.example.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: 'your-email@example.com',
        pass: 'your-password',
      },
      from: 'your-email@example.com',
      fromName: 'Your App Name',
    }),
  ],
})
export class AppModule {}
```

### 2. 在服务中使用

```typescript
import { Injectable } from '@nestjs/common';
import { EmailService } from '@app/library/email';

@Injectable()
export class YourService {
  constructor(private readonly emailService: EmailService) {}

  async sendWelcomeEmail(userEmail: string) {
    await this.emailService.sendHtmlEmail(
      userEmail,
      '欢迎注册',
      '<h1>欢迎使用我们的服务！</h1><p>感谢您的注册。</p>',
    );
  }

  async sendTextEmail() {
    await this.emailService.sendTextEmail(
      'recipient@example.com',
      '通知',
      '这是一封纯文本邮件',
    );
  }

  async sendEmailWithAttachments() {
    await this.emailService.sendEmailWithAttachments(
      'recipient@example.com',
      '带附件的邮件',
      { html: '<p>请查看附件</p>' },
      [
        {
          filename: 'document.pdf',
          path: '/path/to/document.pdf',
        },
      ],
    );
  }
}
```

## 配置选项

### EmailModuleOptions

| 选项       | 类型                             | 必需 | 说明                              |
| ---------- | -------------------------------- | ---- | --------------------------------- |
| `host`     | `string`                         | 是   | SMTP 主机地址                     |
| `port`     | `number`                         | 是   | SMTP 端口                         |
| `secure`   | `boolean`                        | 否   | 是否使用 TLS/SSL（默认：`false`） |
| `auth`     | `{ user: string; pass: string }` | 否   | 认证信息                          |
| `from`     | `string`                         | 否   | 默认发件人地址                    |
| `fromName` | `string`                         | 否   | 默认发件人名称                    |
| `isGlobal` | `boolean`                        | 否   | 是否全局模块（默认：`true`）      |

### SendEmailOptions

| 选项          | 类型                 | 必需 | 说明                         |
| ------------- | -------------------- | ---- | ---------------------------- |
| `to`          | `string \| string[]` | 是   | 收件人邮箱地址（可以是多个） |
| `cc`          | `string \| string[]` | 否   | 抄送邮箱地址                 |
| `bcc`         | `string \| string[]` | 否   | 密送邮箱地址                 |
| `subject`     | `string`             | 是   | 邮件主题                     |
| `text`        | `string`             | 否   | 邮件正文（文本格式）         |
| `html`        | `string`             | 否   | 邮件正文（HTML格式）         |
| `attachments` | `Array<Attachment>`  | 否   | 附件列表                     |
| `replyTo`     | `string`             | 否   | 回复地址                     |
| `from`        | `string`             | 否   | 发件人地址（覆盖默认值）     |

## API 方法

### `sendEmail(options: SendEmailOptions)`

发送邮件，支持所有配置选项。

### `sendTextEmail(to, subject, text, options?)`

发送纯文本邮件。

### `sendHtmlEmail(to, subject, html, options?)`

发送 HTML 邮件。

### `sendEmailWithAttachments(to, subject, content, attachments, options?)`

发送带附件的邮件。

### `verifyConnection()`

验证邮件配置和连接是否正常。

### `getTransporter()`

获取底层 `nodemailer` 传输器实例。

## 常见 SMTP 配置示例

### Gmail

```typescript
EmailModule.forRoot({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password', // 需要使用应用专用密码
  },
});
```

### QQ 邮箱

```typescript
EmailModule.forRoot({
  host: 'smtp.qq.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@qq.com',
    pass: 'your-authorization-code', // 需要使用授权码
  },
});
```

### 163 邮箱

```typescript
EmailModule.forRoot({
  host: 'smtp.163.com',
  port: 465,
  secure: true,
  auth: {
    user: 'your-email@163.com',
    pass: 'your-authorization-code',
  },
});
```
