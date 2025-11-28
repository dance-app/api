import { AccountProvider } from '@prisma/client';

// import { SignInResponseDto } from '@/auth/dto';
import { isValidId, ID_PREFIXES } from '@/lib/id-generator';

function expectPrefixedId(
  id: unknown,
  prefix: (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES],
) {
  expect(typeof id).toBe('string');
  expect(isValidId(id as string, prefix)).toBe(true);
}

export function expectUserShapeWithoutToken(
  body: any,
  dto: { firstName: string; lastName: string; email: string },
) {
  expect(body).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      firstName: dto.firstName,
      lastName: dto.lastName,
      token: null,
      isSuperAdmin: false,
      accounts: expect.any(Array),
    }),
  );
  expectPrefixedId(body.id, ID_PREFIXES.USER);
}

// export function expectSigninResponse(
//   payload: SignInResponseDto,
//   testUser: { firstName: string; lastName: string; email: string },
// ) {
//   expect(payload.user).toEqual(
//     expect.objectContaining({
//       id: expect.any(String),
//       createdAt: expect.any(String),
//       updatedAt: expect.any(String),
//       firstName: testUser.firstName,
//       lastName: testUser.lastName,
//       isSuperAdmin: false,
//       accounts: expect.any(Array),
//     }),
//   );
//   expectPrefixedId(payload.user.id, ID_PREFIXES.USER);
//   payload.user.accounts.forEach((account) =>
//     expectPrefixedId(account.id, ID_PREFIXES.ACCOUNT),
//   );
// }
// export function expectUserShapeWithToken(
//   body: any,
//   dto: { firstName: string; lastName: string; email: string },
// ) {
//   expect(body).toEqual(
//     expect.objectContaining({
//       id: expect.any(String),
//       createdAt: expect.any(String),
//       updatedAt: expect.any(String),
//       firstName: dto.firstName,
//       lastName: dto.lastName,
//       token: expect.any(String),
//       isSuperAdmin: false,
//       accounts: expect.any(Array),
//     }),
//   );
//   expectPrefixedId(body.id, ID_PREFIXES.USER);
//   body.accounts.forEach((account: any) =>
//     expectPrefixedId(account.id, ID_PREFIXES.ACCOUNT),
//   );
// }

export function expectAccountShape(
  account: any,
  userId: string,
  dto: { email: string },
) {
  expect(account).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      provider: AccountProvider.LOCAL,
      email: dto.email,
      isEmailVerified: false,
      userId,
    }),
  );
  expect(account).not.toHaveProperty('password');

  // Validate prefixes
  expectPrefixedId(account.id, ID_PREFIXES.ACCOUNT);
  expectPrefixedId(account.userId, ID_PREFIXES.USER);
}

export function expectJwtResponse(body: any) {
  expect(body).toEqual(expect.objectContaining({ token: expect.any(String) }));
}

export function expectSafeUserWithAccountShape(
  user: any,
  dto: { firstName: string; lastName: string },
) {
  expectPrefixedId(user.id, ID_PREFIXES.USER);
  expect(user.createdAt).toEqual(expect.any(String));
  expect(user.firstName).toBe(dto.firstName);
  expect(user.lastName).toBe(dto.lastName);
  expect(Array.isArray(user.accounts)).toBe(true);
  user.accounts.forEach((acc: any) =>
    expectPrefixedId(acc.id, ID_PREFIXES.ACCOUNT),
  );
}
