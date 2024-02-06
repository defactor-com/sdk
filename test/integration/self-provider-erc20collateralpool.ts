import { Erc20 } from '../../src/erc20'
import { ERC20CollateralPool } from '../../src/erc20-collateral-pool'
import { ecpErrorMessage } from '../../src/error-messages'
import { SelfProvider } from '../../src/self-provider'
import { Lend } from '../../src/types/erc20-collateral-token'
import { sleep } from '../../src/util'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  COLLATERAL_TOKEN,
  COLLATERAL_TOKEN_CHAINLINK,
  ERC20_COLLATERAL_POOL_ETH_ADDRESS,
  MAX_BIGINT,
  TESTING_PRIVATE_KEY,
  TESTING_PUBLIC_KEY,
  USD_TOKEN_ADDRESS,
  loadEnv
} from '../test-util'

jest.setTimeout(1000000)

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

  describe('Constant Variables', () => {
    it('get liquidation protocol fee', async () => {
      const liquidationProtocolFee =
        await provider.contract.LIQUIDATION_PROTOCOL_FEE()

      expect(liquidationProtocolFee).toBe(BigInt('5'))
    })

    it('get usdc fees collected', async () => {
      const usdcFeesCollected = await provider.contract.USDC_FEES_COLLECTED()

      expect(usdcFeesCollected).toBeGreaterThanOrEqual(BigInt('0'))
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
        ecpErrorMessage.noExistPoolId(MAX_BIGINT)
      )
    })

    describe('calculateCollateralTokenAmount()', () => {
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.calculateCollateralTokenAmount(
            MAX_BIGINT,
            BigInt(0)
          )
        ).rejects.toThrow(ecpErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - amount is equal to 0 or negative', async () => {
        await expect(
          provider.contract.calculateCollateralTokenAmount(BigInt(0), BigInt(0))
        ).rejects.toThrow(ecpErrorMessage.noNegativeAmountOrZero)

        await expect(
          provider.contract.calculateCollateralTokenAmount(
            BigInt(0),
            BigInt(-1)
          )
        ).rejects.toThrow(ecpErrorMessage.noNegativeAmountOrZero)
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
        ).rejects.toThrow(ecpErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.getBorrow(BigInt(0), '0xinvalid', BigInt(0))
        ).rejects.toThrow(ecpErrorMessage.wrongAddressFormat)
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
        ).rejects.toThrow(ecpErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.getBorrowsByBorrower(
            BigInt(0),
            '0xinvalid',
            BigInt(0),
            BigInt(10)
          )
        ).rejects.toThrow(ecpErrorMessage.wrongAddressFormat)
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

        const borrowList = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(totalBorrows + BigInt(1)),
          BigInt(10)
        )

        expect(borrowList.length).toBe(0)
      })

      it('success - limit = 1 (5 times)', async () => {
        const borrows = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(0),
          BigInt(1)
        )
        expect(borrows.length).toBe(1)

        let tempBorrows = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(1),
          BigInt(1)
        )
        borrows.push(...tempBorrows)
        expect(borrows.length).toBe(2)

        tempBorrows = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(2),
          BigInt(1)
        )
        borrows.push(...tempBorrows)
        expect(borrows.length).toBe(3)

        tempBorrows = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(3),
          BigInt(1)
        )
        borrows.push(...tempBorrows)
        expect(borrows.length).toBe(4)

        tempBorrows = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(4),
          BigInt(1)
        )
        borrows.push(...tempBorrows)

        expect(borrows.length).toBe(5)
      })

      it('success - limit = 10 (3 times)', async () => {
        const borrows = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(0),
          BigInt(10)
        )
        expect(borrows.length).toBe(10)

        const tempBorrows = await provider.contract.getBorrowsByBorrower(
          BigInt(0),
          TESTING_PUBLIC_KEY,
          BigInt(10),
          BigInt(10)
        )
        borrows.push(...tempBorrows)
        expect(borrows.length).toBe(20)

        for (let i = 2; i < 3; i++) {
          const tempBorrows = await provider.contract.getBorrowsByBorrower(
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
        const borrows = await provider.contract.getBorrowsByBorrower(
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
        const pools = await provider.contract.getPools(
          totalPools + BigInt(1),
          BigInt(10)
        )

        expect(pools.length).toBe(0)
      })

      it('success - offset = 0', async () => {
        const pools = await provider.contract.getPools(BigInt(0), BigInt(10))

        expect(pools.length).toBe(10)
      })

      it('success - limit = 1 (5 times)', async () => {
        const pools = await provider.contract.getPools(BigInt(0), BigInt(1))
        expect(pools.length).toBe(1)

        let tempPools = await provider.contract.getPools(BigInt(1), BigInt(1))
        pools.push(...tempPools)
        expect(pools.length).toBe(2)

        tempPools = await provider.contract.getPools(BigInt(2), BigInt(1))
        pools.push(...tempPools)
        expect(pools.length).toBe(3)

        tempPools = await provider.contract.getPools(BigInt(3), BigInt(1))
        pools.push(...tempPools)
        expect(pools.length).toBe(4)

        tempPools = await provider.contract.getPools(BigInt(4), BigInt(1))
        pools.push(...tempPools)
        expect(pools.length).toBe(5)
      })

      it('success - limit = 10 (10 times)', async () => {
        const pools = await provider.contract.getPools(BigInt(0), BigInt(10))
        expect(pools.length).toBe(10)

        const tempPools = await provider.contract.getPools(
          BigInt(10),
          BigInt(10)
        )
        pools.push(...tempPools)
        expect(pools.length).toBe(20)

        for (let i = 2; i < 10; i++) {
          const tempPools = await provider.contract.getPools(
            BigInt(10 * i),
            BigInt(10)
          )
          pools.push(...tempPools)
          expect(pools.length).toBe(10 * (i + 1))
        }

        expect(pools.length).toBe(100)
      })

      it('success - max limit', async () => {
        const pools = await provider.contract.getPools(BigInt(0), BigInt(1000))

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
        ).rejects.toThrow(ecpErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.calculateRepayInterest(
            BigInt(0),
            '0xinvalid',
            BigInt(0)
          )
        ).rejects.toThrow(ecpErrorMessage.wrongAddressFormat)
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
        ).rejects.toThrow(ecpErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.getTotalLending(BigInt(0), '0xinvalid')
        ).rejects.toThrow(ecpErrorMessage.wrongAddressFormat)
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
        ).rejects.toThrow(ecpErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.getLoan(BigInt(0), '0xinvalid', BigInt(0))
        ).rejects.toThrow(ecpErrorMessage.wrongAddressFormat)
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
        ).rejects.toThrow(ecpErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - wrong address format', async () => {
        await expect(
          provider.contract.listLoansByLender(
            BigInt(0),
            BigInt(10),
            BigInt(0),
            '0xinvalid'
          )
        ).rejects.toThrow(ecpErrorMessage.wrongAddressFormat)
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
        const loans = await provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )

        expect(loans.length).toBe(10)
      })

      it('success - offset exceeds max loans', async () => {
        const loans = await provider.contract.listLoansByLender(
          MAX_BIGINT,
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )

        expect(loans.length).toBe(0)
      })

      it('success - limit = 1 with offset 0, 1, ..., 5', async () => {
        const warehouseLoans = new Array<Lend>()

        let tempLoans = await provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(1)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(1),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(2)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(2),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(3)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(3),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(4)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(4),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(5)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(5),
          BigInt(1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(6)
      })

      it('success - limit = 10 with offset 0, 10, 20, ..., 90', async () => {
        const warehouseLoans = new Array<Lend>()

        let tempLoans = await provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(10)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(10),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(20)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(20),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(30)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(30),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(40)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(40),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(50)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(50),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(60)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(60),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(70)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(70),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(80)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(80),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
        warehouseLoans.push(...tempLoans)

        expect(warehouseLoans.length).toBe(90)

        tempLoans = await provider.contract.listLoansByLender(
          BigInt(90),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
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
  })

  describe('Functions', () => {
    describe('borrow()', () => {
      it('failure - pool id does not exist', async () => {
        await expect(
          provider.contract.borrow(MAX_BIGINT, BigInt(10))
        ).rejects.toThrow(ecpErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - amount is equal to 0 or negative', async () => {
        await expect(
          provider.contract.borrow(BigInt(0), BigInt(0))
        ).rejects.toThrow(ecpErrorMessage.noNegativeAmountOrZero)

        await expect(
          provider.contract.borrow(BigInt(0), BigInt(-1))
        ).rejects.toThrow(ecpErrorMessage.noNegativeAmountOrZero)
      })

      it('failure - pool end time has been reached or overpassed', async () => {
        await expect(
          provider.contract.borrow(BigInt(415), BigInt(10))
        ).rejects.toThrow(ecpErrorMessage.endTimeReached)
      })

      it('success - borrow from the pool', async () => {
        const amountToBorrow = BigInt(10)
        const collateralAmount =
          await provider.contract.calculateCollateralTokenAmount(
            BigInt(0),
            amountToBorrow
          )

        await auTokenContract.approve(
          provider.contract.address,
          collateralAmount
        )
        await sleep(10000)

        const trx = await provider.contract.borrow(BigInt(0), amountToBorrow)

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
      it('failure - pool does not exist', async () => {
        const lendingAmount = BigInt(10_000000)

        await expect(
          provider.contract.lend(MAX_BIGINT, lendingAmount)
        ).rejects.toThrow(ecpErrorMessage.noExistPoolId(MAX_BIGINT))
      })

      it('failure - amount is equal to 0 or negative', async () => {
        const lendingAmount = BigInt(0)
        const negativeLendingAmount = BigInt(-1)

        await expect(
          provider.contract.lend(BigInt(0), lendingAmount)
        ).rejects.toThrow(ecpErrorMessage.noNegativeAmountOrZero)

        await expect(
          provider.contract.lend(BigInt(0), negativeLendingAmount)
        ).rejects.toThrow(ecpErrorMessage.noNegativeAmountOrZero)
      })

      it('success - lend tokens', async () => {
        const lendingAmount = BigInt(10_000000)

        await usdcTokenContract.approve(
          provider.contract.address,
          lendingAmount
        )
        await sleep(10000)

        const trx = await provider.contract.lend(BigInt(0), lendingAmount)

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
            interest: 10,
            collateralDetails: {
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
            interest: 10,
            collateralDetails: {
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
            interest: 10,
            collateralDetails: {
              collateralToken: COLLATERAL_TOKEN,
              collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
              collateralTokenFactor: 10,
              collateralTokenPercentage: 15
            }
          })
        ).rejects.toThrow(ecpErrorMessage.addressIsNotAdmin)
      })

      it('failure - create pool with end time in the pass', async () => {
        provider = new SelfProvider(
          ERC20CollateralPool,
          ERC20_COLLATERAL_POOL_ETH_ADDRESS,
          providerUrl,
          ADMIN_TESTING_PRIVATE_KEY
        )

        await expect(
          provider.contract.addPool({
            endTime: 1706925614,
            interest: 10,
            collateralDetails: {
              collateralToken: COLLATERAL_TOKEN,
              collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
              collateralTokenFactor: 10,
              collateralTokenPercentage: 15
            }
          })
        ).rejects.toThrow(ecpErrorMessage.timeMustBeInFuture)
      })

      it('success - create pool', async () => {
        provider = new SelfProvider(
          ERC20CollateralPool,
          ERC20_COLLATERAL_POOL_ETH_ADDRESS,
          providerUrl,
          ADMIN_TESTING_PRIVATE_KEY
        )

        await provider.contract.addPool({
          endTime: 1911925999,
          interest: 10,
          collateralDetails: {
            collateralToken: COLLATERAL_TOKEN,
            collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
            collateralTokenFactor: 10,
            collateralTokenPercentage: 15
          }
        })

        expect(true).toBe(true)
      })
    })
  })
})
