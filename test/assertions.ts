import { AccountProvider } from '@prisma/client';

export function expectUserShapeWithoutToken(
  body: any,
  dto: { firstName: string; lastName: string; email: string },
) {
  expect(body).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      firstName: dto.firstName,
      lastName: dto.lastName,
      token: null,
      isSuperAdmin: false,
      accounts: expect.any(Array),
    }),
  );
}
export function expectUserShapeWithToken(
  body: any,
  dto: { firstName: string; lastName: string; email: string },
) {
  expect(body).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      firstName: dto.firstName,
      lastName: dto.lastName,
      token: expect.any(String),
      isSuperAdmin: false,
      accounts: expect.any(Array),
    }),
  );
}

export function expectAccountShape(
  account: any,
  userId: number,
  dto: { email: string },
) {
  expect(account).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      provider: AccountProvider.LOCAL,
      email: dto.email,
      isEmailVerified: false,
      userId,
    }),
  );
  expect(account).not.toHaveProperty('password');
}

export function expectJwtResponse(body: any) {
  expect(body).toEqual(expect.objectContaining({ token: expect.any(String) }));
}
