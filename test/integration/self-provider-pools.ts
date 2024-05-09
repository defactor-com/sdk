import { TransactionResponse, isError } from 'ethers'

import { Erc20 } from '../../src'
import {
  cppErrorMessage,
  poolCommonErrorMessage
} from '../../src/error-messages'
import { Pools } from '../../src/pools'
import { SelfProvider } from '../../src/self-provider'
import {
  MAX_BIGINT,
  POOLS_ETH_ADDRESS,
  TESTING_PRIVATE_KEY,
  USD_TOKEN_ADDRESS,
  getUnixEpochTimeInFuture,
  loadEnv
} from '../test-util'

jest.setTimeout(50000)

describe('SelfProvider - Pools', () => {
  let provider: SelfProvider<Pools>
  let usdcTokenContract: Erc20
  const POOL_FEE = BigInt(200_000000)

  const approveTokenAmount = async (
    contract: Erc20,
    provider: SelfProvider<Pools>,
    amount: bigint
  ) => {
    const tx = await contract.approve(provider.contract.address, BigInt(amount))

    if (tx instanceof TransactionResponse) {
      await tx.wait()
    }
  }

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    usdcTokenContract = new Erc20(
      USD_TOKEN_ADDRESS,
      process.env.PROVIDER_URL,
      TESTING_PRIVATE_KEY
    )

    provider = new SelfProvider(
      Pools,
      POOLS_ETH_ADDRESS,
      process.env.PROVIDER_URL,
      TESTING_PRIVATE_KEY
    )
  })

  describe('Constant Variables', () => {
    it('success - get usd token address', async () => {
      const usdTokenAddress = await provider.contract.USD_ADDRESS()

      expect(usdTokenAddress).toBe(USD_TOKEN_ADDRESS)
    })
  })

  describe('Views', () => {
    describe('getPool()', () => {
      it('failure - wrong pool id', async () => {
        await expect(
          provider.contract.getPool(BigInt(MAX_BIGINT))
        ).rejects.toThrow(`Pool id ${MAX_BIGINT.toString()} does not exist`)
      })
      it('success - get a pool by id', async () => {
        const pool = await provider.contract.getPool(BigInt(0))

        const coldPoolData = {
          softCap: pool.softCap,
          hardCap: pool.hardCap,
          deadline: pool.deadline
        }

        expect({
          softCap: BigInt(230),
          hardCap: BigInt(300),
          deadline: BigInt(1911925999)
        }).toEqual(coldPoolData)
      })
    })
    describe('getPools()', () => {
      it('success - fetch pools by pagination', async () => {
        const { data: pools } = await provider.contract.getPools(
          BigInt(0),
          BigInt(10)
        )
        expect(pools.length).toBe(10)

        const { data: tempPools } = await provider.contract.getPools(
          BigInt(10),
          BigInt(10)
        )
        pools.push(...tempPools)
        expect(pools.length).toBe(20)

        const { data: tempPools2 } = await provider.contract.getPools(
          BigInt(20),
          BigInt(10)
        )
        pools.push(...tempPools2)
        expect(pools.length).toBe(30)
      })
      it('success - offset exceeds total pools', async () => {
        const { data: pools } = await provider.contract.getPools(
          MAX_BIGINT,
          BigInt(10)
        )

        expect(pools.length).toBe(0)
      })
    })
  })

  describe('Functions', () => {
    describe('createPool()', () => {
      it('failure - softCap no positive', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(-10_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(1715269435),
            collateralTokens: []
          })
        ).rejects.toThrow(cppErrorMessage.noNegativeSoftCapOrZero)
      })
      it('failure - hardCap is less than softCap', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(10_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(1715269435),
            collateralTokens: []
          })
        ).rejects.toThrow(cppErrorMessage.softCapMustBeLessThanHardCap)
      })
      it('failure - deadline is in the past', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(1715269435),
            collateralTokens: []
          })
        ).rejects.toThrow(cppErrorMessage.deadlineMustBeInFuture)
      })
      it('failure - one or more collateral token has invalid addresses', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            collateralTokens: [
              {
                contractAddress: USD_TOKEN_ADDRESS,
                amount: BigInt(1_000000),
                id: null
              },
              {
                contractAddress: '0x7h1541v4l1d3x4mpl30f4n4ddr35537h3r3umn37',
                amount: BigInt(1_000000),
                id: null
              },
              {
                contractAddress: '0xInvalidAddress',
                amount: BigInt(1_000000),
                id: null
              }
            ]
          })
        ).rejects.toThrow(poolCommonErrorMessage.wrongAddressFormat)
      })
      it('failure - one or more collateral token has invalid amounts', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            collateralTokens: [
              {
                contractAddress: USD_TOKEN_ADDRESS,
                amount: BigInt(1_000000),
                id: null
              },
              {
                contractAddress: USD_TOKEN_ADDRESS,
                amount: BigInt(-1_000000),
                id: null
              }
            ]
          })
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
      })
      it('failure - the amount of 200 fee base tokens (USDC) was not approved', async () => {
        expect.assertions(1)

        const approvedAmount = await usdcTokenContract.balanceOf(
          provider.contract.address
        )

        if (approvedAmount >= POOL_FEE) return

        try {
          await provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            collateralTokens: []
          })
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
      it('failure - the amount of one or more collateral token was not approved', async () => {
        expect.assertions(1)

        const collateralAmount = BigInt(5_000000)
        const approvedAmount = await usdcTokenContract.balanceOf(
          provider.contract.address
        )

        if (approvedAmount >= POOL_FEE + collateralAmount) return

        try {
          await provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: getUnixEpochTimeInFuture(BigInt(60)),
            collateralTokens: [
              {
                contractAddress: USD_TOKEN_ADDRESS,
                amount: collateralAmount,
                id: null
              }
            ]
          })
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
      it('success - create a pool without collaterals', async () => {
        expect.assertions(1)

        const usdcApproved = await usdcTokenContract.balanceOf(
          provider.contract.address
        )

        if (usdcApproved < POOL_FEE) {
          await approveTokenAmount(usdcTokenContract, provider, POOL_FEE)
        }

        await provider.contract.createPool({
          softCap: BigInt(1_000000),
          hardCap: BigInt(5_000000),
          deadline: BigInt(getUnixEpochTimeInFuture(BigInt(86400 * 90))),
          collateralTokens: []
        })

        expect(true).toBe(true)
      })
      it('success - create a pool with many collateral amounts', async () => {
        expect.assertions(1)

        const usdcApproved = await usdcTokenContract.balanceOf(
          provider.contract.address
        )

        if (usdcApproved < POOL_FEE) {
          await approveTokenAmount(usdcTokenContract, provider, POOL_FEE)
        }

        const collaterals = [
          {
            contractAddress: USD_TOKEN_ADDRESS,
            amount: BigInt(1_000000),
            id: null
          },
          {
            contractAddress: USD_TOKEN_ADDRESS,
            amount: BigInt(2_000000),
            id: null
          },
          {
            contractAddress: USD_TOKEN_ADDRESS,
            amount: BigInt(1_000000),
            id: null
          }
        ]

        const collateralsAmount = collaterals.reduce(
          (a, b) => a + b.amount,
          BigInt(0)
        )

        if (usdcApproved < POOL_FEE + collateralsAmount) {
          await approveTokenAmount(
            usdcTokenContract,
            provider,
            collateralsAmount
          )
        }

        await provider.contract.createPool({
          softCap: BigInt(1_000000),
          hardCap: BigInt(5_000000),
          deadline: BigInt(getUnixEpochTimeInFuture(BigInt(86400 * 90))),
          collateralTokens: collaterals
        })

        expect(true).toBe(true)
      })
    })
  })
})
