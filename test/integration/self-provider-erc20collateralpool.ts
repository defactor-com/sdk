import { Erc20 } from '../../src/erc20'
import { ERC20CollateralPool } from '../../src/erc20-collateral-pool'
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

jest.setTimeout(50000)

describe('SelfProvider - ERC20CollateralPool', () => {
  let providerUrl: string
  let provider: SelfProvider<ERC20CollateralPool>
  let erc20Contract: Erc20

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    providerUrl = process.env.PROVIDER_URL
    erc20Contract = new Erc20(
      USD_TOKEN_ADDRESS,
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
    it('get the right liquidation protocol fee', async () => {
      const liquidationProtocolFee =
        await provider.contract.LIQUIDATION_PROTOCOL_FEE()

      expect(liquidationProtocolFee).toBe(BigInt('5'))
    })
  })

  describe('Views', () => {
    it('get a pool by id', async () => {
      const pool = await provider.contract.getPool(BigInt(0))

      const coldPoolData = {
        collateralTokenAmount: BigInt(0),
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
        collateralTokenAmount: pool.collateralTokenAmount,
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
        `Pool id ${MAX_BIGINT} does not exist`
      )
    })

    it('fetch pools by pagination', async () => {
      const pools = await provider.contract.getPools(BigInt(0), BigInt(10))
      expect(pools.length).toBe(10)

      const tempPools = await provider.contract.getPools(BigInt(10), BigInt(10))
      pools.push(...tempPools)
      expect(pools.length).toBe(20)

      const tempPools2 = await provider.contract.getPools(
        BigInt(20),
        BigInt(10)
      )
      pools.push(...tempPools2)
      expect(pools.length).toBe(30)
    })

    it('get empty pool list because offset exceeds total pools', async () => {
      const pools = await provider.contract.getPools(MAX_BIGINT, BigInt(10))

      expect(pools.length).toBe(0)
    })

    it('get loan', async () => {
      const loan = await provider.contract.getLoan(
        BigInt(0),
        TESTING_PUBLIC_KEY,
        BigInt(0)
      )
      const loanAmount = BigInt(10_000000)

      expect(loan.amount).toBe(loanAmount)
    })
  })

  describe('getTotalLendings()', () => {
    it('failure - pool does not exist', async () => {
      await expect(
        provider.contract.getTotalLending(MAX_BIGINT, TESTING_PUBLIC_KEY)
      ).rejects.toThrow(`Pool id ${MAX_BIGINT} does not exist`)
    })

    it('failure - wrong address format', async () => {
      await expect(
        provider.contract.getTotalLending(BigInt(0), '0xinvalid')
      ).rejects.toThrow(`Address does not follow the ethereum address format`)
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
      ).rejects.toThrow(`Pool id ${MAX_BIGINT} does not exist`)
    })

    it('failure - wrong address format', async () => {
      await expect(
        provider.contract.getLoan(BigInt(0), '0xinvalid', BigInt(0))
      ).rejects.toThrow(`Address does not follow the ethereum address format`)
    })

    it('failure - loan object does not exist', async () => {
      await expect(
        provider.contract.getLoan(BigInt(0), TESTING_PUBLIC_KEY, MAX_BIGINT)
      ).rejects.toThrow(`Lending id ${MAX_BIGINT} does not exist`)
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

  describe('lend()', () => {
    it('failure - pool does not exist', async () => {
      const lendingAmount = BigInt(10_000000)

      await expect(
        provider.contract.lend(MAX_BIGINT, lendingAmount)
      ).rejects.toThrow(`Pool id ${MAX_BIGINT} does not exist`)
    })

    it('failure - amount is equal to 0 or negative', async () => {
      const lendingAmount = BigInt(0)
      const negativeLendingAmount = BigInt(-1)

      await expect(
        provider.contract.lend(BigInt(0), lendingAmount)
      ).rejects.toThrow(`Amount cannot be negative or 0`)

      await expect(
        provider.contract.lend(BigInt(0), negativeLendingAmount)
      ).rejects.toThrow(`Amount cannot be negative or 0`)
    })

    it('success - lend tokens', async () => {
      const lendingAmount = BigInt(10_000000)

      await erc20Contract.approve(provider.contract.address, lendingAmount)
      await sleep(3000)

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

  describe('listLoansByLender()', () => {
    it('failure - pool does not exist', async () => {
      await expect(
        provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(10),
          MAX_BIGINT,
          TESTING_PUBLIC_KEY
        )
      ).rejects.toThrow(`Pool id ${MAX_BIGINT} does not exist`)
    })

    it('failure - wrong address format', async () => {
      await expect(
        provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(10),
          BigInt(0),
          '0xinvalid'
        )
      ).rejects.toThrow(`Address does not follow the ethereum address format`)
    })

    it('failure - limit is less or equal than 0 and exceeds max limit', async () => {
      await expect(
        provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(0),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
      ).rejects.toThrow(`Limit cannot be negative or 0`)

      await expect(
        provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(-1),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
      ).rejects.toThrow(`Limit cannot be negative or 0`)

      await expect(
        provider.contract.listLoansByLender(
          BigInt(0),
          BigInt(1001),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
      ).rejects.toThrow(`Max limit allowed is 1000`)
    })

    it('failure - not accepted negative offset', async () => {
      await expect(
        provider.contract.listLoansByLender(
          BigInt(-1),
          BigInt(10),
          BigInt(0),
          TESTING_PUBLIC_KEY
        )
      ).rejects.toThrow(`Offset cannot be negative`)
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

  it('throws an error if collateralToken is not a valid address', async () => {
    await expect(
      provider.contract.createPool({
        endTime: 1911925999,
        interest: 10,
        collateralDetails: {
          collateralToken: 'invalid',
          collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
          collateralTokenFactor: 10,
          collateralTokenPercentage: 15
        }
      })
    ).rejects.toThrow(
      'Collateral token does not follow the ethereum address format'
    )
  })

  it('throws an error if collateralTokenChainlink is not a valid address', async () => {
    await expect(
      provider.contract.createPool({
        endTime: 1911925999,
        interest: 10,
        collateralDetails: {
          collateralToken: COLLATERAL_TOKEN,
          collateralTokenChainlink: 'invalid',
          collateralTokenFactor: 10,
          collateralTokenPercentage: 15
        }
      })
    ).rejects.toThrow(
      'Collateral token chainlink does not follow the ethereum address format'
    )
  })

  it('throws an error if sender address is not admin', async () => {
    await expect(
      provider.contract.createPool({
        endTime: 1911925999,
        interest: 10,
        collateralDetails: {
          collateralToken: COLLATERAL_TOKEN,
          collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
          collateralTokenFactor: 10,
          collateralTokenPercentage: 15
        }
      })
    ).rejects.toThrow('Sender address is not admin')
  })

  it('logs a message if the pool is ready to be created', async () => {
    provider = new SelfProvider(
      ERC20CollateralPool,
      ERC20_COLLATERAL_POOL_ETH_ADDRESS,
      providerUrl,
      ADMIN_TESTING_PRIVATE_KEY
    )

    await provider.contract.createPool({
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
