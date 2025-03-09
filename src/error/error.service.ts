import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class ErrorService {
  constructor() {}

  handler(error: any): undefined {
    /**
     * @see https://www.prisma.io/docs/orm/reference/error-reference#p2002
     */
    if (error.code === 'P2002')
      throw new InternalServerErrorException('Slug already exist');

    throw new InternalServerErrorException('Something happen');
  }
}
