import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
//import { SES } from 'aws-sdk';

export enum MailTransportType {
  SMTP = 'smtp',
  CONSOLE = 'console',
  MEMORY = 'memory',
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
  //SES = 'ses',
}

export interface MailerTransportOptions {
  transport: any;
  defaults?: {
    from?: string;
  };
}

@Injectable()
export class MailTransportFactory {
  constructor(private readonly config: ConfigService) {}

  async createTransport(): Promise<MailerTransportOptions> {
    const adapter = this.config.get<MailTransportType>('MAIL_ADAPTER');

    switch (adapter) {
      case MailTransportType.SMTP:
        return this.createSmtpTransport();

      case MailTransportType.CONSOLE:
        return this.createConsoleTransport();

      case MailTransportType.MEMORY:
        return this.createMemoryTransport();

      case MailTransportType.SENDGRID:
        return this.createSendGridTransport();

      case MailTransportType.MAILGUN:
        return this.createMailgunTransport();

      /*case MailTransportType.SES:
        return this.createSesTransport();*/

      default:
        throw new Error(`Unsupported mail adapter: ${adapter}`);
    }
  }

  // --- Private Transport Creators ---

  private createSmtpTransport(): MailerTransportOptions {
    return {
      transport: {
        host: this.config.get<string>('SMTP_HOST'),
        port: this.config.get<number>('SMTP_PORT'),
        secure: this.config.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      },
    };
  }

  private createConsoleTransport(): MailerTransportOptions {
    return {
      transport: {
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      },
    };
  }

  private createMemoryTransport(): MailerTransportOptions {
    return {
      transport: {
        jsonTransport: true,
      },
    };
  }

  private createSendGridTransport(): MailerTransportOptions {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (!apiKey) throw new Error('SENDGRID_API_KEY is not defined');

    return {
      transport: {
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: apiKey,
        },
      },
    };
  }

  private createMailgunTransport(): MailerTransportOptions {
    return {
      transport: {
        host: this.config.get<string>('MAILGUN_SMTP_HOST'),
        port: this.config.get<number>('MAILGUN_SMTP_PORT'),
        auth: {
          user: this.config.get<string>('MAILGUN_SMTP_USER'),
          pass: this.config.get<string>('MAILGUN_SMTP_PASS'),
        },
      },
    };
  }

  /*private createSesTransport(): MailerTransportOptions {
    const ses = new SES({
      accessKeyId: this.config.get<string>('AWS_SES_ACCESS_KEY_ID'),
      secretAccessKey: this.config.get<string>('AWS_SES_SECRET_ACCESS_KEY'),
      region: this.config.get<string>('AWS_SES_REGION'),
    });

    return {
      transport: {
        SES: ses,
      },
    };
  }*/
}
