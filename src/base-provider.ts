import {
  Pool as Erc20CollateralPool,
  Borrow,
  Lend
} from './types/erc20-collateral-token'
import { Pool as Pools, PoolCommit } from './types/pools'
import { Pools as PoolsClass } from './pools'
import { ERC20CollateralPool } from './erc20-collateral-pool'

type Erc20CollateralTokenPoolDetail = Borrow | Lend

interface Views {
  getPool(poolId: bigint): Promise<Erc20CollateralPool | Pools>

  getPools(
    offset: bigint,
    limit: bigint
  ): Promise<Array<Erc20CollateralPool | Pools>>

  getPoolDetails(
    poolId: bigint,
    walletAddress: string
  ): Promise<Erc20CollateralTokenPoolDetail | PoolCommit>
}

interface AdminFunctions {
  pause(): Promise<void>
  unpause(): Promise<void>
}

export abstract class BaseProvider<T extends PoolsClass | ERC20CollateralPool>
  implements Views, AdminFunctions
{
  readonly contract: T

  constructor(c: T) {
    this.contract = c
  }

  abstract getPool(poolId: bigint): Promise<Erc20CollateralPool | Pools>

  abstract getPools(
    offset: bigint,
    limit: bigint
  ): Promise<Array<Erc20CollateralPool | Pools>>

  abstract getPoolDetails(
    poolId: bigint,
    walletAddress: string
  ): Promise<Erc20CollateralTokenPoolDetail | PoolCommit>

  abstract pause(): Promise<void>

  abstract unpause(): Promise<void>
}
