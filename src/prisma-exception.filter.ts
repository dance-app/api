import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    switch (error.code) {
      case 'P2002':
        return res.status(409).json({ message: 'Duplicate record' });
      default:
        return res
          .status(500)
          .json({ message: 'Database error', detail: error.message });
    }
  }
}
