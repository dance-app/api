// test/jest.e2e.config.ts
import type { Config } from '@jest/types';
// import { pathsToModuleNameMapper } from 'ts-jest';

// import { compilerOptions } from '../tsconfig.json';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  testMatch: ['<rootDir>/**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/test/(.*)$': '<rootDir>/test/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
