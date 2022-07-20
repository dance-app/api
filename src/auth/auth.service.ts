import { Injectable } from '@nestjs/common';

@Injectable({})
export class AuthService {
  signIn() {
    return { message: 'sing-in' };
  }

  signUp() {
    return { message: 'sing-up' };
  }
}
