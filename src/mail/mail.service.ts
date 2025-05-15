import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { AccountProvider } from '@prisma/client';

import { MailHelperService } from './mail-helper.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly mailHelperService: MailHelperService,
  ) {}

  async sendTestEmail(email: string) {
    try {
      const result = await this.mailerService.sendMail({
        to: email,
        subject: 'Hello from NestJS!',
        text: 'This is a test email.',
      });
      this.logger.debug('Test email sent');
      if (result?.message) {
        this.logger.debug('----- Email Content -----');
        this.logger.debug(result.message.toString());
        this.logger.debug('------------------------');
      }
    } catch (e) {
      this.logger.error(`Failed to send test email to ${email}`, e);
      throw e;
    }
  }

  async sendEmailConfirmation(email: string, token: string): Promise<void> {
    const confirmUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/confirm-email?token=${token}`;

    try {
      const result = await this.mailerService.sendMail({
        to: email,
        subject: 'Please confirm your email',
        template: 'confirmation', // This will use templates/confirmation.hbs
        context: this.mailHelperService.getContext({
          name: email.split('@')[0], // Simple name extraction, you might want a proper user name
          confirmUrl,
        }),
      });

      this.logger.debug('Email confirmation message sent');
      if (result?.message) {
        this.logger.debug('----- Email Content -----');
        this.logger.debug(result.message.toString());
        this.logger.debug('------------------------');
      }
    } catch (e) {
      this.logger.error(`Failed to send confirmation email to ${email}`, e);
      throw e;
    }
  }

  async sendSSOAccountReminderEmail(
    email: string,
    providers: AccountProvider[],
  ): Promise<void> {
    const appUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}`;

    try {
      const result = await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Request',
        template: 'sso-reminder', // This will use templates/sso-reminder.hbs
        context: this.mailHelperService.getContext({
          name: email.split('@')[0], // Simple name extraction
          appUrl,
          providers,
        }),
      });

      this.logger.debug('SSOAccountReminder email sent');
      if (result?.message) {
        this.logger.debug('----- Email Content -----');
        this.logger.debug(result.message.toString());
        this.logger.debug('------------------------');
      }
    } catch (e) {
      this.logger.error(`Failed to send sso reminder email to ${email}`, e);
      throw e;
    }
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/reset-password?token=${token}`;

    try {
      const result = await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Request',
        template: 'reset-password', // This will use templates/reset-password.hbs
        context: this.mailHelperService.getContext({
          name: email.split('@')[0], // Simple name extraction
          resetUrl,
        }),
      });

      this.logger.debug('Password reset email sent');
      if (result?.message) {
        this.logger.debug('----- Email Content -----');
        this.logger.debug(result.message.toString());
        this.logger.debug('------------------------');
      }
    } catch (e) {
      this.logger.error(`Failed to send password reset email to ${email}`, e);
      throw e;
    }
  }
}
