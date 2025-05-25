import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.isSuperAdmin !== true) {
      this.logger.log(
        `Unauthorized request to SuperAdmin-only route by user: ${user?.id}`,
      );
      throw new NotFoundException(); // Let's hide the route only accessible to super admins.
    }

    return true;
  }
}
