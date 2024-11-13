import { ethers } from 'ethers'
import timekeeper from 'timekeeper'

import { Erc20 } from '../../src'
import { Buyback } from '../../src/buyback'
import { buybackErrorMessage, commonErrorMessage } from '../../src/errors'
import { SelfProvider } from '../../src/provider'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  BUYBACK_CONTRACT_ADDRESS,
  MAX_BIGINT,
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

  describe('Functions', () => {
    describe('buyback()', () => {
      it.skip('failure - usdc balance is is less than 1000', async () => {
        await expect(provider.contract.buyback()).rejects.toThrow(
          buybackErrorMessage.buybackConstraint
        )
      })
    })
    describe('buybackWithdraw()', () => {
      it.skip('failure - already withdrawn', async () => {
        await expect(
          provider.contract.buybackWithdraw(BigInt(0))
        ).rejects.toThrow(buybackErrorMessage.alreadyWithdrawn)
      })
      it.skip('failure - unlock period not finished', async () => {
        await expect(
          provider.contract.buybackWithdraw(BigInt(0))
        ).rejects.toThrow(buybackErrorMessage.unlockPeriodNotFinished)
      })
    })
    describe('customBuyback()', () => {
      it('failure - usdcAmount is negative', async () => {
        await expect(
          provider.contract.customBuyback(BigInt(-1), [], [])
        ).rejects.toThrow(buybackErrorMessage.nonNegativeAmountOrZero)
      })
      it('failure - usdcAmount is zero', async () => {
        await expect(
          provider.contract.customBuyback(BigInt(0), [], [])
        ).rejects.toThrow(buybackErrorMessage.nonNegativeAmountOrZero)
      })
      it('failure - usdcAmount is less than 1000', async () => {
        await expect(
          provider.contract.customBuyback(BigInt(900_000000), [], [])
        ).rejects.toThrow(buybackErrorMessage.buybackConstraint)
      })
      it('failure - collection array does not have valid addresses', async () => {
        await expect(
          provider.contract.customBuyback(
            BigInt(1000_000000),
            [{ account: '0xinvalid', bps: BigInt(0) }],
            []
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - distribution array does not have valid addresses', async () => {
        await expect(
          provider.contract.customBuyback(
            BigInt(1000_000000),
            [],
            [{ account: '0xinvalid', bps: BigInt(0) }]
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - collection array have zero bps', async () => {
        await expect(
          provider.contract.customBuyback(
            BigInt(1000_000000),
            [
              { account: signerAddress, bps: BigInt(1) },
              { account: signerAddress, bps: BigInt(1) },
              { account: signerAddress, bps: BigInt(0) }
            ],
            []
          )
        ).rejects.toThrow(buybackErrorMessage.nonNegativeOrZeroBps)
      })
      it('failure - collection array have negative bps', async () => {
        await expect(
          provider.contract.customBuyback(
            BigInt(1000_000000),
            [
              { account: signerAddress, bps: BigInt(1) },
              { account: signerAddress, bps: BigInt(1) },
              { account: signerAddress, bps: BigInt(-1) }
            ],
            []
          )
        ).rejects.toThrow(buybackErrorMessage.nonNegativeOrZeroBps)
      })
      it('failure - collection array bps is not 100%', async () => {
        await expect(
          provider.contract.customBuyback(
            BigInt(1000_000000),
            [
              { account: signerAddress, bps: BigInt(80_00) },
              { account: signerAddress, bps: BigInt(15_00) }
            ],
            []
          )
        ).rejects.toThrow(buybackErrorMessage.collectionBpsConstraint)
      })
    })
    describe('customBuybackWithdraw()', () => {
      it.skip('failure - already withdrawn', async () => {
        await expect(
          provider.contract.customBuybackWithdraw(BigInt(0))
        ).rejects.toThrow(buybackErrorMessage.alreadyWithdrawn)
      })
      it.skip('failure - unlock period not finished', async () => {
        await expect(
          provider.contract.customBuybackWithdraw(BigInt(0))
        ).rejects.toThrow(buybackErrorMessage.unlockPeriodNotFinished)
      })
    })
  })

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
    describe('getBuyback()', () => {
      it('failure - the buyback id is negative', async () => {
        await expect(provider.contract.getBuyback(BigInt(-1))).rejects.toThrow(
          buybackErrorMessage.nonExistBuybackId(BigInt(-1))
        )
      })
      it('failure - the buyback does not exists', async () => {
        await expect(provider.contract.getBuyback(MAX_BIGINT)).rejects.toThrow(
          buybackErrorMessage.nonExistBuybackId(MAX_BIGINT)
        )
      })
      it('failure - the buyback does not exists due id max value', async () => {
        await expect(
          provider.contract.getBuyback(BigInt(1) << BigInt(512))
        ).rejects.toThrow(
          buybackErrorMessage.nonExistBuybackId(BigInt(1) << BigInt(512))
        )
      })
    })
    describe('getCustomBuyback()', () => {
      it('failure - the buyback id is negative', async () => {
        await expect(
          provider.contract.getCustomBuyback(BigInt(-1))
        ).rejects.toThrow(
          buybackErrorMessage.nonExistCustomBuybackId(BigInt(-1))
        )
      })
      it('failure - the buyback does not exists', async () => {
        await expect(
          provider.contract.getCustomBuyback(MAX_BIGINT)
        ).rejects.toThrow(
          buybackErrorMessage.nonExistCustomBuybackId(MAX_BIGINT)
        )
      })
    })
    describe('fetchActiveLocks()', () => {
      it('failure - the index is negative', async () => {
        await expect(
          provider.contract.fetchActiveLocks(BigInt(-1))
        ).rejects.toThrow(buybackErrorMessage.nonNegativeBuybackId)
      })
      it('failure - the buyback does not exists', async () => {
        await expect(
          provider.contract.fetchActiveLocks(MAX_BIGINT)
        ).rejects.toThrow(buybackErrorMessage.nonExistBuybackId(MAX_BIGINT))
      })
    })
    describe('fetchActiveCustomLocks()', () => {
      it('failure - the index is negative', async () => {
        await expect(
          provider.contract.fetchActiveCustomLocks(BigInt(-1))
        ).rejects.toThrow(buybackErrorMessage.nonNegativeBuybackId)
      })
      it('failure - the custom buyback does not exists', async () => {
        await expect(
          provider.contract.fetchActiveCustomLocks(MAX_BIGINT)
        ).rejects.toThrow(
          buybackErrorMessage.nonExistCustomBuybackId(MAX_BIGINT)
        )
      })
    })
    describe('calculateOptimalAmount()', () => {
      it('failure - the pool1 is not a valid address', async () => {
        await expect(
          provider.contract.calculateOptimalAmount(
            '0xInvalid',
            signerAddress,
            BigInt(1000)
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the pool2 is not a valid address', async () => {
        await expect(
          provider.contract.calculateOptimalAmount(
            signerAddress,
            '0xInvalid',
            BigInt(1000)
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the usdcAmount is zero', async () => {
        await expect(
          provider.contract.calculateOptimalAmount(
            signerAddress,
            signerAddress,
            BigInt(0)
          )
        ).rejects.toThrow(buybackErrorMessage.nonNegativeAmountOrZero)
      })
      it('failure - the usdcAmount is negative', async () => {
        await expect(
          provider.contract.calculateOptimalAmount(
            signerAddress,
            signerAddress,
            BigInt(-1)
          )
        ).rejects.toThrow(buybackErrorMessage.nonNegativeAmountOrZero)
      })
    })
    describe('estimateAmountOut()', () => {
      it('failure - the tokenIn is not a valid address', async () => {
        await expect(
          provider.contract.estimateAmountOut(
            '0xInvalid',
            BigInt(0),
            signerAddress,
            BigInt(0),
            signerAddress
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the tokenOut is not a valid address', async () => {
        await expect(
          provider.contract.estimateAmountOut(
            signerAddress,
            BigInt(0),
            '0xInvalid',
            BigInt(0),
            signerAddress
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the pool is not a valid address', async () => {
        await expect(
          provider.contract.estimateAmountOut(
            signerAddress,
            BigInt(0),
            signerAddress,
            BigInt(0),
            '0xInvalid'
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the amountIn is zero', async () => {
        await expect(
          provider.contract.estimateAmountOut(
            signerAddress,
            BigInt(0),
            signerAddress,
            BigInt(0),
            signerAddress
          )
        ).rejects.toThrow(buybackErrorMessage.nonNegativeAmountOrZero)
      })
      it('failure - the amountIn is negative', async () => {
        await expect(
          provider.contract.estimateAmountOut(
            signerAddress,
            BigInt(-1),
            signerAddress,
            BigInt(0),
            signerAddress
          )
        ).rejects.toThrow(buybackErrorMessage.nonNegativeAmountOrZero)
      })
      it('failure - the amountIn its over 128 bits', async () => {
        await expect(
          provider.contract.estimateAmountOut(
            signerAddress,
            BigInt(2) ** BigInt(128),
            signerAddress,
            BigInt(0),
            signerAddress
          )
        ).rejects.toThrow(
          commonErrorMessage.nonGreaterThan('amountIn', '128 bits')
        )
      })
      it('failure - the secondsAgo is negative', async () => {
        await expect(
          provider.contract.estimateAmountOut(
            signerAddress,
            BigInt(100),
            signerAddress,
            BigInt(-1),
            signerAddress
          )
        ).rejects.toThrow(buybackErrorMessage.nonNegativeSecondsOrZero)
      })
      it('failure - the secondsAgo its over 32 bits', async () => {
        await expect(
          provider.contract.estimateAmountOut(
            signerAddress,
            BigInt(2) ** BigInt(32),
            signerAddress,
            BigInt(2) ** BigInt(32),
            signerAddress
          )
        ).rejects.toThrow(
          commonErrorMessage.nonGreaterThan('secondsAgo', '32 bits')
        )
      })
    })
    describe('recoverERC20()', () => {
      it('failure - the tokenIn is not a valid address', async () => {
        await expect(
          provider.contract.recoverERC20('0xInvalid')
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
    })
  })
})