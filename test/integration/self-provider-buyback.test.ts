import { ethers } from 'ethers'
import timekeeper from 'timekeeper'

import { Erc20 } from '../../src'
import { Buyback } from '../../src/buyback'
import { SelfProvider } from '../../src/provider'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  BUYBACK_CONTRACT_ADDRESS,
  loadEnv
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Buyback', () => {
  let provider: SelfProvider<Buyback>
  let signerAddress: string

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    provider = new SelfProvider(
      Buyback,
      BUYBACK_CONTRACT_ADDRESS,
      process.env.PROVIDER_URL,
      ADMIN_TESTING_PRIVATE_KEY
    )

    signerAddress = provider.contract.signer?.address || ''

    if (!signerAddress) {
      throw new Error('signer address is not defined')
    }
  })

  beforeEach(() => {
    timekeeper.reset()
  })

  describe('Constant Variables', () => {
    it('success - one hundred', async () => {
      expect(provider.contract.ONE_HUNDRED).toBe(BigInt('100'))
    })
    it('success - three hundred', async () => {
      expect(provider.contract.THREE_HUNDRED).toBe(BigInt('300'))
    })
    it('success - one thousand', async () => {
      expect(provider.contract.ONE_THOUSAND).toBe(BigInt('1000'))
    })
    it('success - ten thousand', async () => {
      expect(provider.contract.TEN_THOUSAND).toBe(BigInt('10000'))
    })
  })

  describe.skip('Functions', () => {})

  describe('Views', () => {
    it('success - get pool 1 fee', async () => {
      expect(await provider.contract.getPool1Fee()).toBe(BigInt('500'))
    })
    it('success - get pool 2 fee', async () => {
      expect(await provider.contract.getPool2Fee()).toBe(BigInt('3000'))
    })
    it('success - get vault 1', async () => {
      const address = await provider.contract.getVault1()

      expect(ethers.isAddress(address)).toBe(true)
    })
    it('success - get vault 2', async () => {
      const address = await provider.contract.getVault2()

      expect(ethers.isAddress(address)).toBe(true)
    })
    it('success - get vault 3', async () => {
      const address = await provider.contract.getVault3()

      expect(ethers.isAddress(address)).toBe(true)
    })
    it('success - get vault 4', async () => {
      const address = await provider.contract.getVault4()

      expect(ethers.isAddress(address)).toBe(true)
    })
    it('success - get uniswap factory', async () => {
      const address = await provider.contract.getUniswapFactory()

      expect(ethers.isAddress(address)).toBe(true)
    })
    it('success - get uniswap router', async () => {
      const address = await provider.contract.getUniswapRouter()

      expect(ethers.isAddress(address)).toBe(true)
    })
    it('success - get factr', async () => {
      expect.assertions(3)

      const address = await provider.contract.getFACTR()

      expect(ethers.isAddress(address)).toBe(true)

      const erc20 = new Erc20(address, provider.contract.apiUrl, null)
      const decimals = await erc20.decimals()

      expect(typeof decimals).toBe('bigint')
      expect(decimals).toBeGreaterThanOrEqual(BigInt(0))
    })
    it('success - get usdc', async () => {
      expect.assertions(3)

      const address = await provider.contract.getUSDC()

      expect(ethers.isAddress(address)).toBe(true)

      const erc20 = new Erc20(address, provider.contract.apiUrl, null)
      const decimals = await erc20.decimals()

      expect(typeof decimals).toBe('bigint')
      expect(decimals).toBeGreaterThanOrEqual(BigInt(0))
    })
    it('success - get weth', async () => {
      expect.assertions(3)

      const address = await provider.contract.getWETH()

      expect(ethers.isAddress(address)).toBe(true)

      const erc20 = new Erc20(address, provider.contract.apiUrl, null)
      const decimals = await erc20.decimals()

      expect(typeof decimals).toBe('bigint')
      expect(decimals).toBeGreaterThanOrEqual(BigInt(0))
    })
    it('success - get recover', async () => {
      const address = await provider.contract.getRecovererAddress()

      expect(ethers.isAddress(address)).toBe(true)
    })
    it('success - get buy frequency', async () => {
      expect.assertions(2)

      const buyFrequency = await provider.contract.getBuyFrequency()

      expect(typeof buyFrequency).toBe('bigint')
      expect(buyFrequency).toBeGreaterThanOrEqual(BigInt(0))
    })
    it('success - get max liquidity slippage', async () => {
      expect.assertions(3)

      const maxLiquiditySlippage =
        await provider.contract.getMaxLiquiditySlippage()

      expect(typeof maxLiquiditySlippage).toBe('bigint')
      expect(maxLiquiditySlippage).toBeGreaterThanOrEqual(BigInt(0))
      expect(maxLiquiditySlippage).toBeLessThanOrEqual(BigInt(10000))
    })
  })
})
