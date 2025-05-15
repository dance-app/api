import { Injectable } from '@nestjs/common';

@Injectable()
export class MailHelperService {
  /**
   * Extend template context with common variables
   */
  getBaseContext(): Record<string, any> {
    return {
      year: new Date().getFullYear(),
      appName: process.env.APP_NAME || 'Dance App',
      // Add other common template variables here
    };
  }

  /**
   * Combine base context with template-specific context
   */
  getContext(context: Record<string, any>): Record<string, any> {
    return {
      ...this.getBaseContext(),
      ...context,
    };
  }
}