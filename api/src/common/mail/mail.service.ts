import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MailService {
  constructor(
    private configService: ConfigService,
    private db: DatabaseService,
  ) {}

  private async getActiveProvider(): Promise<string> {
    try {
      const setting = await this.db.mysql.systemSetting.findUnique({
        where: { key: 'MAIL_PROVIDER' },
      });
      return (
        setting?.value ||
        this.configService.get<string>('MAIL_PROVIDER') ||
        'gmail'
      );
    } catch (error) {
      console.warn(
        'Could not fetch MAIL_PROVIDER from DB, falling back to env',
        error,
      );
      return this.configService.get<string>('MAIL_PROVIDER') || 'gmail';
    }
  }

  private async getTransporter(provider: string) {
    if (provider === 'resend') {
      let apiKey = this.configService.get<string>('RESEND_API_KEY');
      try {
        const setting = await this.db.mysql.systemSetting.findUnique({
          where: { key: 'RESEND_API_KEY' },
        });
        if (setting?.value) apiKey = setting.value;
      } catch (error) {
        console.warn('Could not fetch RESEND_API_KEY from DB', error);
      }

      return nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 587,
        secure: false,
        auth: {
          user: 'resend',
          pass: apiKey,
        },
      });
    } else {
      // Default to Gmail
      const host = this.configService.get<string>('SMTP_HOST');
      const port = this.configService.get<number>('SMTP_PORT');
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASS');

      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
  }

  async sendMail(to: string, subject: string, content: string) {
    let provider = 'gmail';
    try {
      provider = await this.getActiveProvider();
      const transporter = await this.getTransporter(provider);

      let fromEmail = this.configService.get('SMTP_USER');
      if (provider === 'resend') {
        fromEmail = 'onboarding@resend.dev'; // Default Resend test email
        try {
          const setting = await this.db.mysql.systemSetting.findUnique({
            where: { key: 'RESEND_FROM_EMAIL' },
          });
          if (setting?.value) fromEmail = setting.value;
          else if (this.configService.get('RESEND_FROM_EMAIL'))
            fromEmail = this.configService.get('RESEND_FROM_EMAIL');
        } catch (error) {
          if (this.configService.get('RESEND_FROM_EMAIL'))
            fromEmail = this.configService.get('RESEND_FROM_EMAIL');
          else console.warn('Could not fetch RESEND_FROM_EMAIL', error);
        }
      }

      const info = await transporter.sendMail({
        from: `"Acuaequipos Capsulas Acuicolas" <${fromEmail}>`,
        to,
        subject,
        html: content,
      });

      console.log(`Message sent via ${provider}: %s`, info.messageId);
      return info;
    } catch (error) {
      console.error(`Error sending email via ${provider}:`, error);
      // Fallback logic could be added here
      throw error;
    }
  }
}
