import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { AccountProvider, User, Account } from '@prisma/client';
import * as argon from 'argon2';
import { v4 as uuidv4 } from 'uuid';

import { JwtPayload, SignInDto, SignUpDto, VerifyEmailDto } from './dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SafeUserDto } from './dto/safe-user.dto';
import { UserCreatedEvent } from './event/user-created.event';

import { DatabaseService } from '@/database/database.service';
import { MailService } from '@/mail/mail.service';
import { UserService } from '@/user/user.service';
import { UserWithAccount } from '@/user/user.types';

@Injectable({})
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private database: DatabaseService,
    private jwt: JwtService,
    private config: ConfigService,
    private userService: UserService,
    private emailService: MailService,
    private eventEmitter: EventEmitter2,
  ) {}

  //=================
  // Password stuffs
  //=================

  private async hashPassword(password: string): Promise<string> {
    return argon.hash(password);
  }

  private async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await argon.verify(hashedPassword, plainPassword);
  }

  //=================
  //JWT stuffs
  //=================

  private generateJWTokens(payload: JwtPayload): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return { accessToken, refreshToken };
  }

  private generateJWTokensForAccount(
    user: User,
    account: Account,
  ): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: JwtPayload = {
      uid: user.id,
      email: account.email,
      aid: account.id,
      provider: account.provider,
      isSuperAdmin: user.isSuperAdmin,
    };
    return this.generateJWTokens(payload);
  }

  async refreshJWToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.validateJwtPayload(payload);

      const newPayload: JwtPayload = {
        uid: user.id,
        email: payload.email,
        aid: payload.accountId,
        provider: payload.provider,
        isSuperAdmin: user.isSuperAdmin,
      };

      const accessToken = this.jwt.sign(newPayload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateJwtPayload(payload: JwtPayload): Promise<UserWithAccount> {
    try {
      return await this.getUser(payload.uid);
    } catch (NotFoundException) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async getLoginInfo(user: User, account: Account) {
    const { accessToken, refreshToken } = this.generateJWTokensForAccount(
      user,
      account,
    );

    // Get all user accounts
    const accounts = await this.database.account.findMany({
      where: { userId: user.id },
    });

    return {
      user: this.mapToSafeUser(user, accounts),
      accessToken,
      refreshToken,
    };
  }

  // Signup using email
  async signUp(data: SignUpDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      provider = AccountProvider.LOCAL,
    } = data;

    const existingAccount = await this.database.account.findFirst({
      where: { provider: provider, email: email },
    });

    if (!!existingAccount) throw new ConflictException('Email already in use');

    // If it's a LOCAL provider, password is required
    if (provider === AccountProvider.LOCAL && !password) {
      throw new BadRequestException('Password is required for email sign up');
    }

    // Find if user exists with this email (through another social provider)
    const existingUser = await this.userService.readByEmail(data.email);

    let user: User | UserWithAccount;
    let account: Account;
    // If account with same email exists, link new provider to existing user
    if (!!existingUser) {
      // Create a new account and link it to existing user.
      user = existingUser;
      account = await this.database.account.create({
        data: {
          provider,
          email,
          password:
            provider === AccountProvider.LOCAL
              ? await this.hashPassword(password)
              : null,
          isEmailVerified: provider !== AccountProvider.LOCAL, // Auto-verify for SSO providers
          userId: user.id,
        },
      });
    } else {
      // Create brand new user + account
      user = await this.database.user.create({
        data: {
          firstName,
          lastName,
          isSuperAdmin: false, // If you want to create a super admin, write it in the db
          accounts: {
            create: {
              provider,
              email,
              password:
                provider === AccountProvider.LOCAL
                  ? await this.hashPassword(password)
                  : null,
              isEmailVerified: provider !== AccountProvider.LOCAL, // Auto-verify for SSO providers
            },
          },
        },
        include: {
          accounts: true,
        },
      });
      account = (user as UserWithAccount).accounts[0];

      this.eventEmitter.emit(
        'user.created',
        new UserCreatedEvent(user as UserWithAccount, email),
      );
    }

    // For LOCAL provider, send email verification
    if (provider === AccountProvider.LOCAL) {
      const verificationToken = await this.createEmailConfirmationToken(
        account.id,
      );
      await this.emailService.sendEmailConfirmation(email, verificationToken);
    }

    return await this.getLoginInfo(user, account);
  }

  // TODO: prevent sending too many email confirmation or reset passwords
  async resendVerificationEmail(email: string): Promise<void> {
    // Find the account with LOCAL provider
    const account = await this.database.account.findFirst({
      where: { email, provider: AccountProvider.LOCAL },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Create email confirmation token
    const verificationToken = await this.createEmailConfirmationToken(
      account.id,
    );

    // Send verification email
    await this.emailService.sendEmailConfirmation(email, verificationToken);
  }

  private async checkLocalSignIn(password: string, account: Account) {
    if (!password) {
      this.logger.log(
        `Login attempt with no password for account ${account.id}`,
      );
      throw new BadRequestException('Password is required for email sign in');
    }

    if (!account.password) {
      // TODO: We could automatically login using the social account?
      throw new UnauthorizedException(
        'Account exists but requires social login',
      );
    }

    const isPasswordValid = await this.comparePasswords(
      password,
      account.password,
    );
    if (!isPasswordValid) {
      this.logger.log(
        `Login attempt with wrong password for account ${account.id}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (
      this.config.get<boolean>('REQUIRE_EMAIL_VERIF') != true &&
      account.isEmailVerified === false
    ) {
      // Resend verification email
      throw new UnauthorizedException('Email not verified.');
    }
  }

  async signIn(data: SignInDto) {
    const { email, password, provider = AccountProvider.LOCAL } = data;
    this.logger.debug(`Signin request from ${email}`);
    // Find the account
    const account = await this.database.account.findFirst({
      where: { email, provider },
      include: { user: true },
    });

    if (!account) {
      this.logger.debug(`Credentials not correct for ${email}`);
      throw new ForbiddenException('Credentials not correct');
    }
    this.logger.debug(`Trying signing in ${email} with provider ${provider}`);
    if (provider === AccountProvider.LOCAL) {
      await this.checkLocalSignIn(password, account);
    }

    const loginInfo = await this.getLoginInfo(account.user, account);
    this.logger.log(
      `Account ${account.id} for user ${account.user.id} successfully logged in.`,
    );
    return loginInfo;
  }

  //===================
  // FORGOT Password
  //===================

  private generateExpirationDate(hours: number): Date {
    const now = new Date();
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  private async createPasswordResetToken(accountId: number): Promise<string> {
    const token = uuidv4();
    const expiresAt = this.generateExpirationDate(1); // 1 hour expiration

    await this.database.passwordResetToken.upsert({
      where: { accountId },
      update: { token, expiresAt },
      create: { accountId, token, expiresAt },
    });

    return token;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    const accounts = await this.database.account.findMany({
      where: { email },
      include: { user: true },
    });

    if (accounts.length === 0) {
      return; // If no accounts exist, silently return for security
    }

    const localAccount = accounts.find(
      (account) => account.provider === AccountProvider.LOCAL,
    );
    // TODO: check if there is an existing token.
    // If so, check that it's not too recent. If it is, don't resend it. If it isn't, delete it.

    // If there's a LOCAL account, send password reset email
    if (localAccount) {
      const resetToken = await this.createPasswordResetToken(localAccount.id);
      await this.emailService.sendPasswordReset(email, resetToken);
      return;
    }

    // If there are only SSO accounts, send a special email explaining how to log in
    const providers = accounts.map((account) => account.provider);
    await this.emailService.sendSSOAccountReminderEmail(email, providers);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password } = resetPasswordDto;

    // Find the reset token
    const resetToken = await this.database.passwordResetToken.findUnique({
      where: { token },
      include: { account: true },
    });

    if (!resetToken) {
      this.logger.log('resetPassword: Invalid reset token tried.');
      throw new NotFoundException('Invalid or expired token');
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      this.logger.log(
        `resetPassword: expired token ${resetToken.id} for account ${resetToken.accountId}. Deleting...`,
      );
      await this.database.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(password);

    // Update account password and remove token
    await this.database.$transaction([
      // Update password
      this.database.account.update({
        where: { id: resetToken.accountId },
        data: {
          password: hashedPassword,
          isEmailVerified: true, // Verify email if it wasn't already
        },
      }),
      // Delete token
      this.database.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);
  }

  //===================
  //Change password
  //===================

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { accountId, currentPassword, newPassword } = changePasswordDto;
    // Find the account
    const account = await this.database.account.findFirst({
      where: { id: accountId, userId, provider: AccountProvider.LOCAL },
    });

    if (!account) {
      throw new NotFoundException('Account not found or not a LOCAL provider');
    }

    // Verify current password
    const isPasswordValid = await this.comparePasswords(
      currentPassword,
      account.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update account password
    await this.database.account.update({
      where: { id: accountId },
      data: {
        password: hashedPassword,
      },
    });
  }

  //===================
  // Verify email
  //===================

  private async createEmailConfirmationToken(
    accountId: number,
  ): Promise<string> {
    const token = uuidv4();
    const expiresAt = this.generateExpirationDate(24); // 24 hours expiration

    await this.database.emailConfirmationToken.upsert({
      where: { accountId },
      update: { token, expiresAt },
      create: { accountId, token, expiresAt },
    });

    return token;
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ success: true }> {
    const { token } = verifyEmailDto;

    const emailToken = await this.database.emailConfirmationToken.findUnique({
      where: { token },
      include: { account: true },
    });

    if (!emailToken) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (new Date() > emailToken.expiresAt) {
      // Delete expired token
      await this.database.emailConfirmationToken.delete({
        where: { id: emailToken.id },
      });
      throw new BadRequestException('Invalid or expired token');
    }

    await this.database.$transaction([
      // Update account as verified
      this.database.account.update({
        where: { id: emailToken.accountId },
        data: { isEmailVerified: true },
      }),
      // Delete token after use
      this.database.emailConfirmationToken.delete({
        where: { id: emailToken.id },
      }),
    ]);

    return { success: true };
  }

  //=================
  // Retrieve users
  //=================

  public mapToSafeUser(user: User, accounts: Account[]): SafeUserDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      isSuperAdmin: user.isSuperAdmin,
      accounts: accounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        email: account.email,
        isEmailVerified: account.isEmailVerified,
        createdAt: account.createdAt,
      })),
    };
  }

  private async getUser(userId: number): Promise<UserWithAccount> {
    const user = await this.database.user.findUnique({
      where: { id: userId },
      include: { accounts: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return user;
  }
  async getUserProfile(userId: number): Promise<SafeUserDto> {
    const user = await this.getUser(userId);

    return this.mapToSafeUser(user, user.accounts);
  }
}
