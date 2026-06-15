import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailOptions } from './interfaces/notification.interfaces';

/**
 * Email service that integrates with SendGrid or AWS SES.
 * Falls back to a no-op logger when credentials are not configured.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly provider: 'sendgrid' | 'ses' | 'none';

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>(
      'NOTIFICATION_EMAIL_FROM',
      'noreply@tourism-marketplace.com'
    );
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
    const sesRegion = this.configService.get<string>('AWS_SES_REGION');

    if (sendgridKey) {
      this.provider = 'sendgrid';
    } else if (sesRegion) {
      this.provider = 'ses';
    } else {
      this.provider = 'none';
      this.logger.warn('No email provider configured. Emails will be logged only.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.provider === 'sendgrid') {
        return await this.sendViaSendGrid(options);
      } else if (this.provider === 'ses') {
        return await this.sendViaSES(options);
      } else {
        this.logger.log(
          `[EMAIL MOCK] To: ${options.to} | Subject: ${options.subject} | Body: ${options.text.substring(0, 100)}...`
        );
        return true;
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}: ${(err as Error).message}`);
      return false;
    }
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<boolean> {
    // Dynamic import to avoid hard dependency when not configured
    const sgMail = await import('@sendgrid/mail').catch(() => null);
    if (!sgMail) {
      this.logger.warn('@sendgrid/mail not installed, falling back to log');
      this.logger.log(`[SENDGRID MOCK] To: ${options.to} | Subject: ${options.subject}`);
      return true;
    }

    const apiKey = this.configService.get<string>('SENDGRID_API_KEY', '');
    sgMail.default.setApiKey(apiKey);

    await sgMail.default.send({
      to: options.to,
      from: this.from,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    this.logger.log(`Email sent via SendGrid to ${options.to}`);
    return true;
  }

  private async sendViaSES(options: EmailOptions): Promise<boolean> {
    // Dynamic import to avoid hard dependency when not configured
    const awsSdk = await import('@aws-sdk/client-ses').catch(() => null);
    if (!awsSdk) {
      this.logger.warn('@aws-sdk/client-ses not installed, falling back to log');
      this.logger.log(`[SES MOCK] To: ${options.to} | Subject: ${options.subject}`);
      return true;
    }

    const region = this.configService.get<string>('AWS_SES_REGION', 'us-east-1');
    const client = new awsSdk.SESClient({ region });

    await client.send(
      new awsSdk.SendEmailCommand({
        Source: this.from,
        Destination: { ToAddresses: [options.to] },
        Message: {
          Subject: { Data: options.subject },
          Body: {
            Text: { Data: options.text },
            ...(options.html ? { Html: { Data: options.html } } : {}),
          },
        },
      })
    );

    this.logger.log(`Email sent via AWS SES to ${options.to}`);
    return true;
  }
}
