import {
  commonErrorMessage,
  erc20CollateralPoolErrorMessage as ecpErrorMessage,
  poolCommonErrorMessage
} from '../../src/errors'
import { ERC20CollateralPool } from '../../src/pools'
import { SelfProvider } from '../../src/provider'
import { Lend, Pool } from '../../src/types/erc20-collateral-token'
import { Erc20 } from '../../src/utilities/erc20'
import { sleep } from '../../src/utilities/util'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  COLLATERAL_TOKEN,
  COLLATERAL_TOKEN_CHAINLINK,
  ERC20_COLLATERAL_POOL_ETH_ADDRESS,
  MAX_BIGINT,
  ONE_DAY_MS,
  ONE_SEC_MS,
  TESTING_PRIVATE_KEY,
  TESTING_PUBLIC_KEY,
  USD_TOKEN_ADDRESS,
  loadEnv,
  setPause,
  waitUntilConfirmationCompleted
} from '../test-util'

jest.setTimeout(9000000)

describe('SelfProvider - ERC20CollateralPool', () => {
  let providerUrl: string
  let provider: SelfProvider<ERC20CollateralPool>
  let usdcTokenContract: Erc20
  let auTokenContract: Erc20

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    providerUrl = process.env.PROVIDER_URL
    usdcTokenContract = new Erc20(
      USD_TOKEN_ADDRESS,
      providerUrl,
      TESTING_PRIVATE_KEY
    )
    auTokenContract = new Erc20(
      COLLATERAL_TOKEN,
      providerUrl,
      TESTING_PRIVATE_KEY
    )
  })

  beforeEach(() => {
    provider = new SelfProvider(
      ERC20CollateralPool,
      ERC20_COLLATERAL_POOL_ETH_ADDRESS,
      providerUrl,
      TESTING_PRIVATE_KEY
    )
  })

  describe('Admin Functions', () => {
    describe('pause()', () => {
      it('success - pause contract', async () => {
        await setPause(provider, false)

        expect.assertions(1)

        const tx = await provider.contract.pause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        const isPaused = await provider.contract.isPaused()

        expect(isPaused).toBe(true)
      })
    })
    describe('unpause()', () => {
      it('success - unpause the contract', async () => {
        expect.assertions(1)

        const tx = await provider.contract.unpause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        const isPaused = await provider.contract.isPaused()

        expect(isPaused).toBe(false)
      })
    })
  })

  describe('Views', () => {
    it('get a pool by id', async () => {
      const pool = await provider.contract.getPool(BigInt(0))
      const coldPoolData = {
        endTime: BigInt(1711925999),
        collateralDetails: {
          collateralToken: '0x81da82b49CD9Ee7b7d67B4655784581f30590eA1',
          collateralTokenChainlink:
            '0x997a6BCe1372baca6Bbb8db382Cb12F2dDca2b45',
          collateralTokenFactor: BigInt(115),
          collateralTokenPercentage: BigInt(50)
        },
        interest: BigInt(10)
      }
      expect({
        endTime: pool.endTime,
        collateralDetails: {
          collateralToken: pool.collateralDetails.collateralToken,
          collateralTokenChainlink:
            pool.collateralDetails.collateralTokenChainlink,
          collateralTokenFactor: pool.collateralDetails.collateralTokenFactor,
          collateralTokenPercentage:
            pool.collateralDetails.collateralTokenPercentage
        },
        interest: pool.interest
      }).toEqual(coldPoolData)
    })
    it('get error because wrong pool id', async () => {
      await expect(provider.contract.getPool(MAX_BIGINT)).rejects.toThrow(
        poolCommonErrorMessage.noExistPoolId(MAX_BIGINT)
      )
    })
    describe('calculateCollateralTokenAmount()', () => {
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.calculateCollateralTokenAmount(
            MAX_BIGINT,
            BigInt(0)
          )
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })
      it('failure - amount is equal to 0 or negative', async () => {
        await expect(
          provider.contract.calculateCollateralTokenAmount(BigInt(0), BigInt(0))
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
        await expect(
          provider.contract.calculateCollateralTokenAmount(
            BigInt(0),
            BigInt(-1)
          )
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
      })
      it('success - get the collateral amount', async () => {
        const collateralAmount =
          await provider.contract.calculateCollateralTokenAmount(
            BigInt(0),
            BigInt(10)
          )
        expect(collateralAmount).toBe(BigInt('372006973844'))
      })
    })
    describe('getBorrow()', () => {
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.getBorrow(MAX_BIGINT, TESTING_PUBLIC_KEY, BigInt(0))
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })
      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.getBorrow(BigInt(0), '0xinvalid', BigInt(0))
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - borrow id does not exist', async () => {
        await expect(
          provider.contract.getBorrow(BigInt(0), TESTING_PUBLIC_KEY, MAX_BIGINT)
        ).rejects.toThrow(ecpErrorMessage.noExistBorrowId(MAX_BIGINT))
      })
      it('success - get borrow information', async () => {
        const borrow = await provider.contract.getBorrow(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(0)
        )
        expect({
          amount: borrow.amount,
          borrowTime: borrow.borrowTime,
          collateralTokenAmount: borrow.collateralTokenAmount
        }).toEqual({
          amount: BigInt('10'),
          borrowTime: BigInt('1706887089'),
          collateralTokenAmount: BigInt('372006973844')
        })
      })
    })
    describe('getBorrowsByBorrower()', () => {
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.getBorrowsByBorrower(
            BigInt(MAX_BIGINT),
            TESTING_PUBLIC_KEY,
            BigInt(0),
            BigInt(10)
          )
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })
      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.getBorrowsByBorrower(
            BigInt(0),
            '0xinvalid',
            BigInt(0),
            BigInt(10)
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - limit = 0, negative and max limit reached', async () => {
        await expect(
          provider.contract.getBorrowsByBorrower(
            BigInt(0),
            TESTING_PUBLIC_KEY,
            BigInt(-10),
            BigInt(0)
          )
        ).rejects.toThrow(ecpErrorMessage.noNegativeOffset)
        await expect(
          provider.contract.getBorrowsByBorrower(
            BigInt(0),
            TESTING_PUBLIC_KEY,
            BigInt(0),
            BigInt(-10)
          )
        ).rejects.toThrow(ecpErrorMessage.noNegativeLimitOrZero)
        await expect(
          provider.contract.getBorrowsByBorrower(
            BigInt(0),
            TESTING_PUBLIC_KEY,
            BigInt(0),
            BigInt(1001)
          )
        ).rejects.toThrow(ecpErrorMessage.maxLimitAllowed)
      })
      it('failure - not accepted negative offset', async () => {
        await expect(
          provider.contract.getBorrowsByBorrower(
            BigInt(0),
            TESTING_PUBLIC_KEY,
            BigInt(-10),
            BigInt(0)
          )
        ).rejects.toThrow(ecpErrorMessage.noNegativeOffset)
      })
      it('success - get empty borrow list because offset exceeds total borrows', async () => {
        const totalBorrows = await provider.contract.getTotalBorrows(
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        const { data: borrowList } =
          await provider.contract.getBorrowsByBorrower(
            BigInt(0),
            TESTING_PUBLIC_KEY,
            BigInt(totalBorrows + BigInt(1)),
            BigInt(10)
          )
        expect(borrowList.length).toBe(0)
      })
      it('success - limit = 1 (5 times)', async () => {
        const { data: borrows } = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(0),
          BigInt(1)
        )
        expect(borrows.length).toBe(1)
        let { data: tempBorrows } =
          await provider.contract.getBorrowsByBorrower(
            BigInt(0),
            TESTING_PUBLIC_KEY,
            BigInt(1),
            BigInt(1)
          )
        borrows.push(...tempBorrows)
        expect(borrows.length).toBe(2)
        ;({ data: tempBorrows } = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(2),
          BigInt(1)
        ))
        borrows.push(...tempBorrows)
        expect(borrows.length).toBe(3)
        ;({ data: tempBorrows } = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(3),
          BigInt(1)
        ))
        borrows.push(...tempBorrows)
        expect(borrows.length).toBe(4)
        ;({ data: tempBorrows } = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(4),
          BigInt(1)
        ))
        borrows.push(...tempBorrows)
        expect(borrows.length).toBe(5)
      })
      it('success - limit = 10 (3 times)', async () => {
        const { data: borrows } = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(0),
          BigInt(10)
        )
        expect(borrows.length).toBe(10)
        const { data: tempBorrows } =
          await provider.contract.getBorrowsByBorrower(
            BigInt(0),
            TESTING_PUBLIC_KEY,
            BigInt(10),
            BigInt(10)
          )
        borrows.push(...tempBorrows)
        expect(borrows.length).toBe(20)
        for (let i = 2; i < 3; i++) {
          const { data: tempBorrows } =
            await provider.contract.getBorrowsByBorrower(
              BigInt(0),
              TESTING_PUBLIC_KEY,
              BigInt(10 * i),
              BigInt(10)
            )
          borrows.push(...tempBorrows)
          expect(borrows.length).toBe(10 * (i + 1))
        }
        expect(borrows.length).toBe(30)
      })
      it('success - max limit', async () => {
        const { data: borrows } = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(0),
          BigInt(1000)
        )
        expect(borrows.length).toBeGreaterThan(0)
      })
    })
    describe('getPools()', () => {
      it('failure - limit = 0, negative and max limit reached', async () => {
        await expect(
          provider.contract.getPools(BigInt(-10), BigInt(0))
        ).rejects.toThrow(ecpErrorMessage.noNegativeOffset)
        await expect(
          provider.contract.getPools(BigInt(0), BigInt(-10))
        ).rejects.toThrow(ecpErrorMessage.noNegativeLimitOrZero)
        await expect(
          provider.contract.getPools(BigInt(0), BigInt(1001))
        ).rejects.toThrow(ecpErrorMessage.maxLimitAllowed)
      })
      it('failure - not accepted negative offset', async () => {
        await expect(
          provider.contract.getPools(BigInt(-10), BigInt(10))
        ).rejects.toThrow(ecpErrorMessage.noNegativeOffset)
      })
      it('success - get empty pool list because offset exceeds total pools', async () => {
        const totalPools = await provider.contract.getTotalPools()
        const { data: pools } = await provider.contract.getPools(
          totalPools + BigInt(1),
          BigInt(10)
        )
        expect(pools.length).toBe(0)
      })
      it('success - offset = 0', async () => {
        const { data: pools } = await provider.contract.getPools(
          BigInt(0),
          BigInt(10)
        )
        expect(pools.length).toBe(10)
      })
      it('success - limit = 1 (5 times)', async () => {
        const { data: pools } = await provider.contract.getPools(
          BigInt(0),
          BigInt(1)
        )
        expect(pools.length).toBe(1)
        let { data: tempPools } = await provider.contract.getPools(
          BigInt(1),
          BigInt(1)
        )
        pools.push(...tempPools)
        expect(pools.length).toBe(2)
        ;({ data: tempPools } = await provider.contract.getPools(
          BigInt(2),
          BigInt(1)
        ))
        pools.push(...tempPools)
        expect(pools.length).toBe(3)
        ;({ data: tempPools } = await provider.contract.getPools(
          BigInt(3),
          BigInt(1)
        ))
        pools.push(...tempPools)
        expect(pools.length).toBe(4)
        ;({ data: tempPools } = await provider.contract.getPools(
          BigInt(4),
          BigInt(1)
        ))
        pools.push(...tempPools)
        expect(pools.length).toBe(5)
      })
      it('success - limit = 10 (10 times)', async () => {
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
        for (let i = 2; i < 10; i++) {
          const { data: tempPools } = await provider.contract.getPools(
            BigInt(10 * i),
            BigInt(10)
          )
          pools.push(...tempPools)
          expect(pools.length).toBe(10 * (i + 1))
        }
        expect(pools.length).toBe(100)
      })
      it('success - max limit', async () => {
        const { data: pools } = await provider.contract.getPools(
          BigInt(0),
          BigInt(1000)
        )
        expect(pools.length).toBeGreaterThan(0)
      })
    })
    describe('calculateRepayInterest()', () => {
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.calculateRepayInterest(
            BigInt(MAX_BIGINT),
            TESTING_PUBLIC_KEY,
            BigInt(0)
          )
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })
      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.calculateRepayInterest(
            BigInt(0),
            '0xinvalid',
            BigInt(0)
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - borrow id does not exist', async () => {
        await expect(
          provider.contract.calculateRepayInterest(
            BigInt(0),
            TESTING_PUBLIC_KEY,
            BigInt(MAX_BIGINT)
          )
        ).rejects.toThrow(ecpErrorMessage.noExistBorrowId(MAX_BIGINT))
      })
      it('success - get interest amount', async () => {
        const repayInterest = await provider.contract.calculateRepayInterest(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(0)
        )
        expect(repayInterest).toBeGreaterThanOrEqual(BigInt(0))
      })
    })
    describe('getTotalLendings()', () => {
      it('failure - pool does not exist', async () => {
        await expect(
          provider.contract.getTotalLending(MAX_BIGINT, TESTING_PUBLIC_KEY)
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })
      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.getTotalLending(BigInt(0), '0xinvalid')
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('success - get total loans', async () => {
        const totalLoans = await provider.contract.getTotalLending(
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        expect(totalLoans).toBeGreaterThanOrEqual(BigInt('6'))
      })
    })
    describe('getLoan()', () => {
      it('failure - pool does not exist', async () => {
        await expect(
          provider.contract.getLoan(MAX_BIGINT, TESTING_PUBLIC_KEY, BigInt(0))
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })
      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.getLoan(BigInt(0), '0xinvalid', BigInt(0))
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - loan object does not exist', async () => {
        await expect(
          provider.contract.getLoan(BigInt(0), TESTING_PUBLIC_KEY, MAX_BIGINT)
        ).rejects.toThrow(ecpErrorMessage.noExistLendingId(MAX_BIGINT))
      })
      it('success - get loan', async () => {
        const loan = await provider.contract.getLoan(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(0)
        )
        expect(loan.amount).toBe(BigInt(10_000000))
      })
    })
    describe('listLoansByLender()', () => {
      it('failure - pool does not exist', async () => {
        await expect(
          provider.contract.listLoansByLender(
            BigInt(0),
            BigInt(10),
            MAX_BIGINT,
            TESTING_PUBLIC_KEY
          )
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })
      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.listLoansByLender(
            BigInt(0),
            BigInt(10),
            BigInt(0),
            '0xinvalid'
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - limit is less or equal than 0 and exceeds max limit', async () => {
        await expect(
          provider.contract.listLoansByLender(
            BigInt(0),
            BigInt(0),
            BigInt(0),
            TESTING_PUBLIC_KEY
          )
        ).rejects.toThrow(ecpErrorMessage.noNegativeLimitOrZero)
        await expect(
          provider.contract.listLoansByLender(
            BigInt(0),
            BigInt(-1),
            BigInt(0),
            TESTING_PUBLIC_KEY
          )
        ).rejects.toThrow(ecpErrorMessage.noNegativeLimitOrZero)
        await expect(
          provider.contract.listLoansByLender(
            BigInt(0),
            BigInt(1001),
            BigInt(0),
            TESTING_PUBLIC_KEY
          )
        ).rejects.toThrow(ecpErrorMessage.maxLimitAllowed)
      })
      it('failure - not accepted negative offset', async () => {
        await expect(
          provider.contract.listLoansByLender(
            BigInt(-1),
            BigInt(10),
            BigInt(0),
            TESTING_PUBLIC_KEY
          )
        ).rejects.toThrow(ecpErrorMessage.noNegativeOffset)
      })
      it('success - offset = 0', async () => {
        const { data: loans } = await provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        expect(loans.length).toBe(10)
      })
      it('success - offset exceeds max loans', async () => {
        const { data: loans } = await provider.contract.listLoansByLender(
          MAX_BIGINT,
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        expect(loans.length).toBe(0)
      })
      it('success - limit = 1 with offset 0, 1, ..., 5', async () => {
        const warehouseLoans = new Array<Lend>()
        let { data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(1)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(1),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(2)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(2),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(3)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(3),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(4)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(4),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(5)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(5),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(6)
      })
      it('success - limit = 10 with offset 0, 10, 20, ..., 90', async () => {
        const warehouseLoans = new Array<Lend>()
        let { data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(10)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(10),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(20)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(20),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(30)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(30),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(40)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(40),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(50)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(50),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(60)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(60),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(70)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(70),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(80)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(80),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(90)
        ;({ data: tempLoans } = await provider.contract.listLoansByLender(
          BigInt(90),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        ))
        warehouseLoans.push(...tempLoans)
        expect(warehouseLoans.length).toBe(100)
      })
      // it('success - limit = 1000', async () => {
      //   const loans = await provider.contract.listLoansByLender(
      //     BigInt(0),
      //     BigInt(1000),
      //     BigInt(0),
      //     TESTING_PUBLIC_KEY
      //   )
      //   expect(loans.length).toBe(1000)
      // })
    })
    describe('getLiquidationInfo()', () => {
      it('failure - pool is not closed', async () => {
        const pool: Pool = {
          lended: BigInt(0),
          borrowed: BigInt(0),
          repaid: BigInt(0),
          rewards: BigInt(0),
          collateralTokenAmount: BigInt(0),
          liquidatedCollateral: BigInt(0),
          collateralTokenAmountAtLiquidation: BigInt(0),
          rewardPerToken: BigInt(0),
          rewardRate: BigInt(0),
          lastUpdated: 0,
          endTime: Date.now() + ONE_DAY_MS,
          collateralDetails: {
            minLended: 1,
            minBorrow: 1,
            maxLended: 10000000,
            collateralToken: COLLATERAL_TOKEN,
            collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
            collateralTokenFactor: 0,
            collateralTokenPercentage: 0
          },
          interest: 0,
          liquidated: false
        }
        await expect(
          provider.contract.getLiquidationInfo(pool)
        ).rejects.toThrow(ecpErrorMessage.poolIsNotClosed)
      })
      it('failure - pool does not exist', async () => {
        const pool: Pool = {
          lended: BigInt(0),
          borrowed: BigInt(0),
          repaid: BigInt(0),
          rewards: BigInt(0),
          collateralTokenAmount: BigInt(0),
          liquidatedCollateral: BigInt(0),
          collateralTokenAmountAtLiquidation: BigInt(0),
          rewardPerToken: BigInt(0),
          rewardRate: BigInt(0),
          lastUpdated: 0,
          endTime: 0,
          collateralDetails: {
            minLended: 1,
            minBorrow: 1,
            maxLended: 10000000,
            collateralToken: COLLATERAL_TOKEN,
            collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
            collateralTokenFactor: 0,
            collateralTokenPercentage: 0
          },
          interest: 0,
          liquidated: true
        }
        await expect(
          provider.contract.getLiquidationInfo(pool)
        ).rejects.toThrow(ecpErrorMessage.poolCannotBeLiquidated)
      })
      it('success - get liquidation info', async () => {
        const pool: Pool = {
          lended: BigInt(10000),
          borrowed: BigInt(1000),
          repaid: BigInt(900),
          rewards: BigInt(0),
          collateralTokenAmount: BigInt(10),
          liquidatedCollateral: BigInt(0),
          collateralTokenAmountAtLiquidation: BigInt(0),
          rewardPerToken: BigInt(10),
          rewardRate: BigInt(0),
          lastUpdated: 0,
          endTime: Date.now() - ONE_DAY_MS,
          collateralDetails: {
            minLended: 1,
            minBorrow: 1,
            maxLended: 10000000,
            collateralToken: COLLATERAL_TOKEN,
            collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
            collateralTokenFactor: 0,
            collateralTokenPercentage: 0
          },
          interest: 0,
          liquidated: false
        }
        const liquidationInfo = await provider.contract.getLiquidationInfo(pool)
        const expectedLiquidationInfo = {
          remainingInterest: BigInt(100000),
          liquidatableAmountWithProtocolFee: BigInt(105105),
          liquidatableAmountWithLiquidationFee: BigInt(110110)
        }
        expect(liquidationInfo).toEqual(expectedLiquidationInfo)
      })
    })
    describe('getLiquidatableAmountWithProtocolFee()', () => {
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.getLiquidatableAmountWithProtocolFee(
            MAX_BIGINT,
            TESTING_PUBLIC_KEY,
            BigInt(0)
          )
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })
      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.getLiquidatableAmountWithProtocolFee(
            BigInt(0),
            '0xinvalid',
            BigInt(0)
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - borrow id does not exist', async () => {
        await expect(
          provider.contract.getLiquidatableAmountWithProtocolFee(
            BigInt(0),
            TESTING_PUBLIC_KEY,
            MAX_BIGINT
          )
        ).rejects.toThrow(ecpErrorMessage.noExistBorrowId(MAX_BIGINT))
      })
      it('success - get liquidatable amount with protocol fee', async () => {
        const amount =
          await provider.contract.getLiquidatableAmountWithProtocolFee(
            BigInt(6),
            TESTING_PUBLIC_KEY,
            BigInt(0)
          )

        expect(typeof amount).toBe('bigint')
        expect(amount).toBeGreaterThanOrEqual(BigInt(0))
      })
    })
  })

  describe('Functions', () => {
    describe('borrow()', () => {
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.borrow(MAX_BIGINT, BigInt(10))
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - amount is equal to 0 or negative', async () => {
        await expect(
          provider.contract.borrow(BigInt(0), BigInt(0))
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)

        await expect(
          provider.contract.borrow(BigInt(0), BigInt(-1))
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
      })

      it('failure - pool end time has been reached or overpassed', async () => {
        await expect(
          provider.contract.borrow(BigInt(415), BigInt(10))
        ).rejects.toThrow(ecpErrorMessage.endTimeReached)
      })

      it('failure - the borrow amount is less than the min borrow', async () => {
        await expect(
          provider.contract.borrow(BigInt(3), BigInt(2))
        ).rejects.toThrow(ecpErrorMessage.amountTooLow)
      })

      it('success - borrow from the pool', async () => {
        const amountToBorrow = BigInt(15)
        const poolId = BigInt(0)
        const collateralAmount =
          await provider.contract.calculateCollateralTokenAmount(
            poolId,
            amountToBorrow
          )

        const tx = await auTokenContract.approve(
          provider.contract.address,
          collateralAmount
        )

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        const trx = await provider.contract.borrow(poolId, amountToBorrow)

        expect({
          to: trx.to,
          from: trx.from
        }).toEqual({
          to: ERC20_COLLATERAL_POOL_ETH_ADDRESS,
          from: TESTING_PUBLIC_KEY
        })
      })
    })

    describe('lend()', () => {
      it('failure - the contract is paused', async () => {
        expect.assertions(1)
        await setPause(provider, true)
        await expect(
          provider.contract.lend(BigInt(0), BigInt(0))
        ).rejects.toThrow(commonErrorMessage.contractIsPaused)
        await setPause(provider, false)
      })

      it('failure - pool does not exist', async () => {
        const lendingAmount = BigInt(10_000000)

        await expect(
          provider.contract.lend(MAX_BIGINT, lendingAmount)
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - pool is closed', async () => {
        const lendingAmount = BigInt(1000000)

        await expect(
          provider.contract.lend(BigInt(650), lendingAmount)
        ).rejects.toThrow(ecpErrorMessage.poolIsClosed)
      })

      it('failure - amount is equal to 0 or negative', async () => {
        const lendingAmount = BigInt(0)
        const negativeLendingAmount = BigInt(-1)

        await expect(
          provider.contract.lend(BigInt(0), lendingAmount)
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)

        await expect(
          provider.contract.lend(BigInt(0), negativeLendingAmount)
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
      })

      it('failure - lend an amount of tokens less than min lended', async () => {
        const lendingAmount = BigInt(2)
        const poolId = BigInt(0)

        await expect(
          provider.contract.lend(poolId, lendingAmount)
        ).rejects.toThrow(ecpErrorMessage.amountTooLow)
      })

      it('failure - lend an amount of tokens greater than max lended', async () => {
        const lendingAmount = BigInt(MAX_BIGINT)
        const poolId = BigInt(0)

        await expect(
          provider.contract.lend(poolId, lendingAmount)
        ).rejects.toThrow(ecpErrorMessage.maxLentIsReached)
      })

      it('success - lend tokens', async () => {
        const lendingAmount = BigInt(10_000000)
        const poolId = BigInt(0)

        const tx = await usdcTokenContract.approve(
          provider.contract.address,
          lendingAmount
        )
        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        const trx = await provider.contract.lend(poolId, lendingAmount)

        expect({
          to: trx.to,
          from: trx.from
        }).toEqual({
          to: ERC20_COLLATERAL_POOL_ETH_ADDRESS,
          from: TESTING_PUBLIC_KEY
        })
      })
    })

    describe('addPool()', () => {
      it('failure - collateralToken is not a valid address', async () => {
        await expect(
          provider.contract.addPool({
            endTime: 1911925999,
            interest: 1000, // 10%
            collateralDetails: {
              minLended: 1,
              minBorrow: 1,
              maxLended: 10000000,
              collateralToken: 'invalid',
              collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
              collateralTokenFactor: 10,
              collateralTokenPercentage: 15
            }
          })
        ).rejects.toThrow(ecpErrorMessage.wrongAddressFormatCustom())
      })

      it('failure - collateralTokenChainlink is not a valid address', async () => {
        await expect(
          provider.contract.addPool({
            endTime: 1911925999,
            interest: 1000, // 10%
            collateralDetails: {
              minLended: 1,
              minBorrow: 1,
              maxLended: 10000000,
              collateralToken: COLLATERAL_TOKEN,
              collateralTokenChainlink: 'invalid',
              collateralTokenFactor: 10,
              collateralTokenPercentage: 15
            }
          })
        ).rejects.toThrow(ecpErrorMessage.wrongAddressFormatCustom('chainlink'))
      })

      it('failure - sender address is not admin', async () => {
        await expect(
          provider.contract.addPool({
            endTime: 1911925999,
            interest: 1000, // 10%
            collateralDetails: {
              minLended: 1,
              minBorrow: 1,
              maxLended: 10000000,
              collateralToken: COLLATERAL_TOKEN,
              collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
              collateralTokenFactor: 10,
              collateralTokenPercentage: 15
            }
          })
        ).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })

      it('failure - create pool with end time in the past', async () => {
        provider = new SelfProvider(
          ERC20CollateralPool,
          ERC20_COLLATERAL_POOL_ETH_ADDRESS,
          providerUrl,
          ADMIN_TESTING_PRIVATE_KEY
        )

        await expect(
          provider.contract.addPool({
            endTime: 1706925614,
            interest: 1000, // 10%
            collateralDetails: {
              minLended: 1,
              minBorrow: 1,
              maxLended: 10000000,
              collateralToken: COLLATERAL_TOKEN,
              collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
              collateralTokenFactor: 10,
              collateralTokenPercentage: 15
            }
          })
        ).rejects.toThrow(ecpErrorMessage.timeMustBeInFuture)
      })

      it('failure - create pool with a min lended greater than max lended', async () => {
        await expect(
          provider.contract.addPool({
            endTime: 1911925999,
            interest: 1000, // 10%
            collateralDetails: {
              minLended: 10000000000,
              minBorrow: 1,
              maxLended: 10000000,
              collateralToken: COLLATERAL_TOKEN,
              collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
              collateralTokenFactor: 10,
              collateralTokenPercentage: 15
            }
          })
        ).rejects.toThrow(ecpErrorMessage.minLentMustBeLessThanMaxLent)
      })

      it('failure - create pool with a min lended of zero', async () => {
        await expect(
          provider.contract.addPool({
            endTime: 1911925999,
            interest: 1000, // 10%
            collateralDetails: {
              minLended: 0,
              minBorrow: 1,
              maxLended: 10000000,
              collateralToken: COLLATERAL_TOKEN,
              collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
              collateralTokenFactor: 10,
              collateralTokenPercentage: 15
            }
          })
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
      })

      it('failure - create pool with a min borrow of zero', async () => {
        await expect(
          provider.contract.addPool({
            endTime: 1911925999,
            interest: 1000, // 10%
            collateralDetails: {
              minLended: 1,
              minBorrow: 0,
              maxLended: 10000000,
              collateralToken: COLLATERAL_TOKEN,
              collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
              collateralTokenFactor: 10,
              collateralTokenPercentage: 15
            }
          })
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
      })

      it('failure - create pool with a min borrow greater than max lended', async () => {
        await expect(
          provider.contract.addPool({
            endTime: 1911925999,
            interest: 1000, // 10%
            collateralDetails: {
              minLended: 1,
              minBorrow: 10000000,
              maxLended: 100,
              collateralToken: COLLATERAL_TOKEN,
              collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
              collateralTokenFactor: 10,
              collateralTokenPercentage: 15
            }
          })
        ).rejects.toThrow(ecpErrorMessage.minBorrowMustBeLessThanMaxLent)
      })

      it('success - create pool', async () => {
        provider = new SelfProvider(
          ERC20CollateralPool,
          ERC20_COLLATERAL_POOL_ETH_ADDRESS,
          providerUrl,
          ADMIN_TESTING_PRIVATE_KEY
        )

        const tx = await provider.contract.addPool({
          endTime: 1911925999,
          interest: 1000, // 10%
          collateralDetails: {
            minLended: 5,
            minBorrow: 10,
            maxLended: 10000000,
            collateralToken: COLLATERAL_TOKEN,
            collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
            collateralTokenFactor: 10,
            collateralTokenPercentage: 15
          }
        })

        expect(tx).toBeDefined()
      })
    })

    describe('repay()', () => {
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.repay(MAX_BIGINT, TESTING_PUBLIC_KEY, BigInt(0))
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.repay(BigInt(0), '0xinvalid', BigInt(0))
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })

      it('failure - borrow id does not exist', async () => {
        await expect(
          provider.contract.repay(BigInt(0), TESTING_PUBLIC_KEY, MAX_BIGINT)
        ).rejects.toThrow(ecpErrorMessage.noExistBorrowId(MAX_BIGINT))
      })

      it('failure - borrow has been repaid', async () => {
        const borrow = await provider.contract.getBorrow(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(1)
        )
        const repayInterest = await provider.contract.calculateRepayInterest(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(1)
        )

        const tx = await usdcTokenContract.approve(
          provider.contract.address,
          repayInterest + borrow.amount
        )
        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        await expect(
          provider.contract.repay(BigInt(0), TESTING_PUBLIC_KEY, BigInt(1))
        ).rejects.toThrow(ecpErrorMessage.borrowAlreadyRepaid)
      })

      it('success - repay the borrow', async () => {
        const totalBorrows = await provider.contract.getTotalBorrows(
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        const amountToBorrow = BigInt(10)
        const collateralAmount =
          await provider.contract.calculateCollateralTokenAmount(
            BigInt(0),
            amountToBorrow
          )

        const tx = await auTokenContract.approve(
          provider.contract.address,
          collateralAmount
        )
        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )
        const tx2 = await provider.contract.borrow(BigInt(0), amountToBorrow)
        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx2
        )

        const borrow = await provider.contract.getBorrow(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          totalBorrows
        )

        const repayInterest = await provider.contract.calculateRepayInterest(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          totalBorrows
        )

        const tx3 = await usdcTokenContract.approve(
          provider.contract.address,
          repayInterest + borrow.amount
        )
        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx3
        )

        const trx = await provider.contract.repay(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          totalBorrows
        )

        expect({
          to: trx.to,
          from: trx.from
        }).toEqual({
          to: ERC20_COLLATERAL_POOL_ETH_ADDRESS,
          from: TESTING_PUBLIC_KEY
        })
      })
    })

    describe('liquidatePool()', () => {
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.liquidatePool(BigInt(MAX_BIGINT))
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - pool is not closed', async () => {
        provider = new SelfProvider(
          ERC20CollateralPool,
          ERC20_COLLATERAL_POOL_ETH_ADDRESS,
          providerUrl,
          ADMIN_TESTING_PRIVATE_KEY
        )

        const totalPools = await provider.contract.getTotalPools()

        const tx = await provider.contract.addPool({
          endTime: Date.now() + ONE_DAY_MS,
          interest: 1000, // 10%
          collateralDetails: {
            minLended: 1,
            minBorrow: 1,
            maxLended: 10000000,
            collateralToken: COLLATERAL_TOKEN,
            collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
            collateralTokenFactor: 10,
            collateralTokenPercentage: 15
          }
        })

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        await expect(
          provider.contract.liquidatePool(totalPools)
        ).rejects.toThrow(ecpErrorMessage.poolIsNotClosed)
      })

      it('failure - pool cannot be liquidated', async () => {
        provider = new SelfProvider(
          ERC20CollateralPool,
          ERC20_COLLATERAL_POOL_ETH_ADDRESS,
          providerUrl,
          ADMIN_TESTING_PRIVATE_KEY
        )

        const totalPools = await provider.contract.getTotalPools()

        const tx = await provider.contract.addPool({
          endTime: Date.now() + ONE_SEC_MS * 10,
          interest: 1000, // 10%
          collateralDetails: {
            minLended: 1,
            minBorrow: 1,
            maxLended: 10000000,
            collateralToken: COLLATERAL_TOKEN,
            collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
            collateralTokenFactor: 10,
            collateralTokenPercentage: 15
          }
        })

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        await sleep(10000)

        await expect(
          provider.contract.liquidatePool(totalPools)
        ).rejects.toThrow(ecpErrorMessage.poolCannotBeLiquidated)
      })

      it('success - liquidate the pool', async () => {
        // const totalPools = await provider.contract.getTotalPools()
        // const poolId = totalPools - BigInt(1) // BigInt(0)
        // const pool = await provider.contract.getPool(poolId)
        // // Lend to the pool
        // const lendingAmount = BigInt(1_000000) // 1 USDC
        // await usdcTokenContract.approve(
        //   provider.contract.address,
        //   lendingAmount
        // )
        // await sleep(10000)
        // await provider.contract.lend(poolId, lendingAmount)
        // // Borrow from the pool
        // const amountToBorrow = BigInt(500000) // 0.5 USDC
        // const collateralAmount =
        //   await provider.contract.calculateCollateralTokenAmount(
        //     poolId,
        //     amountToBorrow
        //   )
        // await auTokenContract.approve(
        //   provider.contract.address,
        //   collateralAmount
        // )
        // await sleep(10000)
        // await provider.contract.borrow(poolId, amountToBorrow)
        // await sleep(10000)
        // // repay
        // const totalBorrows = await provider.contract.getTotalBorrows(
        //   poolId,
        //   TESTING_PUBLIC_KEY
        // )
        // const lastBorrowId = totalBorrows - BigInt(1)
        // const repayInterest = await provider.contract.calculateRepayInterest(
        //   poolId,
        //   TESTING_PUBLIC_KEY,
        //   lastBorrowId
        // )
        // await usdcTokenContract.approve(
        //   provider.contract.address,
        //   repayInterest + amountToBorrow
        // )
        // await sleep(10000)
        // // await provider.contract.repay(poolId, TESTING_PUBLIC_KEY, lastBorrowId)
        // const liquidationInfo = await provider.contract.getLiquidationInfo(pool)
        // await usdcTokenContract.approve(
        //   provider.contract.address,
        //   liquidationInfo.liquidatableAmountWithProtocolFee
        // )
        // await sleep(20000)
        // await provider.contract.liquidatePool(poolId)
      })
    })

    describe('claimRewards()', () => {
      it('failure - pool does not exist', async () => {
        const poolId = BigInt(MAX_BIGINT)
        const loanId = BigInt(0)

        await expect(
          provider.contract.claimRewards(poolId, TESTING_PUBLIC_KEY, loanId)
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - wrong address format', async () => {
        // pending to be implemented
      })
      it('failure - lending id does not exist', async () => {
        // pending to be implemented
      })
      it('failure - pool is not closed', async () => {
        // pending to be implemented
      })
      it('failure - pool is not completed', async () => {
        // pending to be implemented
      })
      it('failure - loan is already claimed', async () => {
        // pending to be implemented
      })

      it('success - claim rewards', async () => {
        const poolId = BigInt(0)
        const loanId = BigInt(0)

        await provider.contract.claimRewards(poolId, TESTING_PUBLIC_KEY, loanId)
      })
    })

    describe('liquidateUserPosition', () => {
      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.liquidateUserPosition(
            BigInt(0),
            '0xinvalid',
            BigInt(0)
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.liquidateUserPosition(
            MAX_BIGINT,
            TESTING_PUBLIC_KEY,
            BigInt(0)
          )
        ).rejects.toThrow(poolCommonErrorMessage.noExistPoolId(MAX_BIGINT))
      })
      it('failure - the pool is not closed', async () => {
        await expect(
          provider.contract.liquidateUserPosition(
            BigInt(6),
            TESTING_PUBLIC_KEY,
            BigInt(0)
          )
        ).rejects.toThrow(ecpErrorMessage.poolIsNotClosed)
      })
      it('failure - borrow id does not exist', async () => {
        await expect(
          provider.contract.liquidateUserPosition(
            BigInt(7),
            TESTING_PUBLIC_KEY,
            MAX_BIGINT
          )
        ).rejects.toThrow(ecpErrorMessage.noExistBorrowId(MAX_BIGINT))
      })
      it('failure - borrow already repaid', async () => {
        await expect(
          provider.contract.liquidateUserPosition(
            BigInt(7),
            TESTING_PUBLIC_KEY,
            BigInt(0)
          )
        ).rejects.toThrow(ecpErrorMessage.borrowAlreadyRepaid)
      })
      it('success - liquidate user position', async () => {
        const poolId = BigInt(0)
        const address = TESTING_PUBLIC_KEY
        const borrowId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const borrow = await provider.contract.getBorrow(
          poolId,
          address,
          borrowId
        )
        const repayInterest = await provider.contract.calculateRepayInterest(
          poolId,
          address,
          borrowId
        )
        const liquidatableAmount = borrow.amount + repayInterest
        const LIQUIDATION_PROTOCOL_FEE =
          provider.contract.LIQUIDATION_PROTOCOL_FEE
        const LIQUIDATION_FEE = provider.contract.LIQUIDATION_FEE
        const HOUNDRED = provider.contract.HOUNDRED
        const liquidatableAmountWithLiquidationFee =
          (liquidatableAmount *
            (LIQUIDATION_FEE + LIQUIDATION_PROTOCOL_FEE + HOUNDRED)) /
          HOUNDRED
        const collateralTokenDecimals = 18 // Depends of the collateralToken contract
        const usdcDecimals = 6
        const chainlinkDecimals = usdcDecimals // Depends of the collateralTokenChainlink oracle contract
        const chainlinkPrice = BigInt(31_10347680) // Depends of the collateralTokenChainlink oracle contract
        const estimatedErc20Value =
          (chainlinkPrice * BigInt(1e18) * HOUNDRED) /
          BigInt(pool.collateralDetails.collateralTokenFactor) /
          BigInt(10 ** chainlinkDecimals)
        let collateralTokenForLiquidator =
          (BigInt(1e18) *
            (liquidatableAmountWithLiquidationFee *
              BigInt(10) ** (BigInt(18) - BigInt(usdcDecimals)))) /
          estimatedErc20Value /
          BigInt(10) ** (BigInt(18) - BigInt(collateralTokenDecimals))

        if (collateralTokenForLiquidator > borrow.collateralTokenAmount) {
          collateralTokenForLiquidator = borrow.collateralTokenAmount
        }

        const tx = await usdcTokenContract.approve(
          provider.contract.address,
          collateralTokenForLiquidator
        )

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        const trx = await provider.contract.liquidateUserPosition(
          poolId,
          address,
          borrowId
        )

        expect({
          to: trx.to,
          from: trx.from
        }).toEqual({
          to: ERC20_COLLATERAL_POOL_ETH_ADDRESS,
          from: TESTING_PUBLIC_KEY
        })
      })
    })
  })
})
