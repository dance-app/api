import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable({})
export class AuthService {
  constructor(private database: DatabaseService) {}

  signIn() {
    return { message: 'sing-in' };
  }

  signUp() {
    return { message: 'sing-up' };
  }
}
