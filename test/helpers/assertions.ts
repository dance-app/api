import { InvitationStatus, InviteType, WorkspaceRole } from '@prisma/client';

import { MockMailService } from '../mock-services/mock-mail.service';

export class TestAssertions {
  static expectUserShape(user: any, expectedFields: string[] = []) {
    expect(user).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        firstName: expect.any(String),
        lastName: expect.any(String),
        createdAt: expect.any(String),
        ...expectedFields.reduce((acc, field) => {
          acc[field] = expect.anything();
          return acc;
        }, {} as any),
      }),
    );
  }

  static expectWorkspaceShape(workspace: any) {
    expect(workspace).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        slug: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  }

  static expectInvitationShape(invitation: any, type: 'WORKSPACE' | 'EVENT') {
    expect(invitation).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        type,
        token: expect.any(String),
        status: expect.any(String),
        createdAt: expect.any(String),
        expiresAt: expect.any(String),
      }),
    );
  }

  static expectMemberShape(member: any, expectedRoles: WorkspaceRole[] = []) {
    expect(member).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        roles: expect.arrayContaining(expectedRoles),
        workspaceId: expect.any(Number),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );

    // Verify all expected roles are present
    expectedRoles.forEach((role) => {
      expect(member.roles).toContain(role);
    });
  }

  static expectAttendeeShape(attendee: any) {
    expect(attendee).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        eventId: expect.any(Number),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );

    // Should have either userId or guestEmail
    expect(attendee.userId !== null || attendee.guestEmail !== null).toBe(true);
  }

  static expectEmailSent(
    mailService: MockMailService,
    expectedEmail: string,
    subjectContains: string,
  ) {
    expect(mailService.sentMails.length).toBeGreaterThan(0);
    const lastMail = mailService.sentMails[mailService.sentMails.length - 1];
    expect(lastMail.to).toBe(expectedEmail);
    expect(lastMail.subject).toContain(subjectContains);
    return lastMail;
  }

  static expectPaginatedResponse(response: any, expectedLength: number) {
    expect(response).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([]),
        meta: expect.objectContaining({
          totalCount: expect.any(Number),
          count: expectedLength,
          page: expect.any(Number),
          pages: expect.any(Number),
          limit: expect.any(Number),
          offset: expect.any(Number),
        }),
      }),
    );
    expect(response.data).toHaveLength(expectedLength);
  }

  // ============================================================================
  // Invitation-specific assertions
  // ============================================================================

  static expectWorkspaceInvitationShape(invitation: any) {
    this.expectInvitationShape(invitation, 'WORKSPACE');

    expect(invitation).toEqual(
      expect.objectContaining({
        workspaceName: expect.any(String),
        workspaceSlug: expect.any(String),
        memberSeatId: expect.any(Number),
        inviterName: expect.any(String),
      }),
    );
  }

  static expectEventInvitationShape(invitation: any) {
    this.expectInvitationShape(invitation, 'EVENT');

    expect(invitation).toEqual(
      expect.objectContaining({
        eventId: expect.any(Number),
        eventName: expect.any(String),
        attendeeSeatId: expect.any(Number),
        inviterName: expect.any(String),
      }),
    );
  }

  static expectInvitationStatus(
    invitation: any,
    expectedStatus: InvitationStatus,
  ) {
    expect(invitation.status).toBe(expectedStatus);
  }

  static expectInvitationNotExpired(invitation: any) {
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
  }

  static expectInvitationExpired(invitation: any) {
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(now.getTime());
  }

  static expectMemberLinkedToUser(member: any, expectedUserId: number) {
    expect(member.userId).toBe(expectedUserId);
  }

  static expectMemberNotLinked(member: any) {
    expect(member.userId).toBeNull();
  }

  static expectAttendeeLinkedToUser(attendee: any, expectedUserId: number) {
    expect(attendee.userId).toBe(expectedUserId);
  }

  static expectAttendeeNotLinked(attendee: any) {
    expect(attendee.userId).toBeNull();
  }

  // ============================================================================
  // Invitation workflow assertions
  // ============================================================================

  static expectInvitationWorkflowComplete(
    invitation: any,
    member: any,
    userId: number,
  ) {
    this.expectInvitationStatus(invitation, InvitationStatus.ACCEPTED);
    expect(invitation.inviteeId).toBe(userId);
    this.expectMemberLinkedToUser(member, userId);
  }

  static expectEventInvitationWorkflowComplete(
    invitation: any,
    attendee: any,
    userId: number,
  ) {
    this.expectInvitationStatus(invitation, InvitationStatus.ACCEPTED);
    expect(invitation.inviteeId).toBe(userId);
    this.expectAttendeeLinkedToUser(attendee, userId);
  }

  // ============================================================================
  // Bulk invitation assertions
  // ============================================================================

  static expectInvitationList(
    invitations: any[],
    expectedCount: number,
    expectedType: InviteType,
  ) {
    expect(invitations).toHaveLength(expectedCount);
    invitations.forEach((invitation) => {
      expect(invitation.type).toBe(expectedType);
      this.expectInvitationShape(invitation, expectedType);
    });
  }

  static expectWorkspaceInvitationList(
    invitations: any[],
    expectedCount: number,
  ) {
    this.expectInvitationList(invitations, expectedCount, InviteType.WORKSPACE);
    invitations.forEach((invitation) => {
      this.expectWorkspaceInvitationShape(invitation);
    });
  }

  static expectEventInvitationList(invitations: any[], expectedCount: number) {
    this.expectInvitationList(invitations, expectedCount, InviteType.EVENT);
    invitations.forEach((invitation) => {
      this.expectEventInvitationShape(invitation);
    });
  }

  // ============================================================================
  // Email-specific invitation assertions
  // ============================================================================

  static expectInvitationEmailSent(
    mailService: MockMailService,
    invitation: any,
  ) {
    const sentMail = this.expectEmailSent(
      mailService,
      invitation.email,
      'Invitation',
    );

    expect(sentMail.context).toEqual(
      expect.objectContaining({
        inviteToken: invitation.token,
      }),
    );

    return sentMail;
  }

  static expectWorkspaceInvitationEmailSent(
    mailService: MockMailService,
    invitation: any,
  ) {
    const sentMail = this.expectInvitationEmailSent(mailService, invitation);

    expect(sentMail.context).toEqual(
      expect.objectContaining({
        workspaceName: expect.any(String),
        inviterName: expect.any(String),
        assignedRole: expect.any(String),
      }),
    );

    return sentMail;
  }

  static expectEventInvitationEmailSent(
    mailService: MockMailService,
    invitation: any,
  ) {
    const sentMail = this.expectInvitationEmailSent(mailService, invitation);

    expect(sentMail.context).toEqual(
      expect.objectContaining({
        eventName: expect.any(String),
        eventDate: expect.any(String),
        inviterName: expect.any(String),
      }),
    );

    return sentMail;
  }
}
