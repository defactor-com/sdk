/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    // '**/__tests__/**/*.[jt]s?(x)',
    // '**/?(*.)+(spec|test).[jt]s?(x)',
    '**/test/integration/self-provider-staking.test.[jt]s'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/']
}
