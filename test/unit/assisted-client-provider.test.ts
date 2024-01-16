// import { AssistedProvider } from '../../src/assisted-provider'

import { loadEnv } from '../test-util'

jest.setTimeout(50000)

describe('AssistedClientProvider', () => {
  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }
  })

  beforeEach(() => {})

  it('mock test', async () => {
    expect(1).toEqual(1)
  })
})
