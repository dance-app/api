import { Injectable, Logger } from '@nestjs/common';
import { AccountProvider } from '@prisma/client';

@Injectable()
export class MockMailService {
  private readonly logger = new Logger(MockMailService.name);
  sentMails: Array<{
    to: string;
    subject: string;
    content: string;
    context?: any;
  }> = [];

  reset() {
    this.sentMails = [];
  }

  sendSSOAccountReminderEmail(
    email: string,
    providers: AccountProvider[],
  ): void {
    this.logger.debug(`sendSSOAccountReminderEmail to ${email}`);
    this.sentMails.push({
      to: email,
      subject: 'Use SSO to connect',
      content: `Your account is configured with sso`,
      context: { providers },
    });
  }

  async sendEmailConfirmation(email: string, token: string) {
    this.logger.debug(`sendEmailConfirmation to ${email}`);
    this.sentMails.push({
      to: email,
      subject: 'Verify your email address',
      content: `Please verify your email by clicking on the following link: ${token}`,
      context: { token },
    });
  }

  sendPasswordReset(email: string, token: string) {
    this.logger.debug(`sendPasswordReset to ${email}`);
    this.sentMails.push({
      to: email,
      subject: 'Reset Your Password',
      content: `You can reset your password by clicking on the following link: ${token}`,
      context: { token },
    });
  }

  sendPasswordChangedConfirmation(to: string) {
    this.logger.debug(`sendPasswordChangedConfirmation to ${to}`);
    this.sentMails.push({
      to,
      subject: 'Your Password Has Been Changed',
      content: 'Your password has been successfully changed.',
    });
  }

  sendWorkspaceInviteEmail(
    email: string,
    inviteToken: string,
    inviterName: string,
    workspaceName: string,
    assignedRole: string,
    roleDescription: string,
  ): void {
    this.logger.debug(`sendWorkspaceInviteEmail to ${email}`);
    this.sentMails.push({
      to: email,
      subject: 'Workspace Invitation',
      content: `You have been invited to join ${workspaceName} by ${inviterName}. Your role will be ${assignedRole}.`,
      context: {
        inviteToken,
        inviterName,
        workspaceName,
        assignedRole,
        roleDescription,
      },
    });
  }

  sendEventInviteEmail(
    email: string,
    eventName: string,
    inviteToken: string,
    inviteeFirstName: string,
    inviterName: string,
    eventDate: Date,
    eventLocation: string,
    eventDescription: string | undefined,
    additionalInfo: string | undefined,
  ): void {
    this.logger.debug(`sendEventInviteEmail to ${email}`);
    this.sentMails.push({
      to: email,
      subject: 'Event Invitation',
      content: `You have been invited to ${eventName} by ${inviterName}.`,
      context: {
        eventName,
        inviteToken,
        inviteeFirstName,
        inviterName,
        eventDate,
        eventLocation,
        eventDescription,
        additionalInfo,
      },
    });
  }
}
