import { AccountProvider } from '@prisma/client';

export class MockMailService {
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
    this.sentMails.push({
      to: email,
      subject: 'Use SSO to connect',
      content: `Your account is configured with sso`,
      context: { providers },
    });
  }

  sendEmailConfirmation(email: string, token: string) {
    this.sentMails.push({
      to: email,
      subject: 'Verify your email address',
      content: `Please verify your email by clicking on the following link: ${token}`,
      context: { token },
    });
  }

  sendPasswordReset(email: string, token: string) {
    this.sentMails.push({
      to: email,
      subject: 'Reset Your Password',
      content: `You can reset your password by clicking on the following link: ${token}`,
      context: { token },
    });
  }

  sendPasswordChangedConfirmation(to: string) {
    this.sentMails.push({
      to,
      subject: 'Your Password Has Been Changed',
      content: 'Your password has been successfully changed.',
    });
  }

  async sendWorkspaceInviteEmail(
    email: string,
    inviteToken: string,
    inviterName: string,
    workspaceName: string,
    assignedRole: string,
    roleDescription: string,
  ): Promise<void> {
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

  async sendEventInviteEmail(
    email: string,
    eventName: string,
    inviteToken: string,
    inviteeFirstName: string,
    inviterName: string,
    eventDate: Date,
    eventLocation: string,
    eventDescription: string | undefined,
    additionalInfo: string | undefined,
  ): Promise<void> {
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
