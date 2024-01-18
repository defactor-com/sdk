import {
  Pool as Erc20CollateralPool,
  Borrow,
  Lend
} from './types/erc20-collateral-token'
import { Pool as Pools, PoolCommit } from './types/pools'
import { Pool } from './types/erc20-collateral-token'
import { Abi, PrivateKey } from './types/types'
import { BaseProvider } from './base-provider'
import { BaseContractConstructorParams } from './base-contract'
import { Pools as PoolsClass } from './pools'
import { ERC20CollateralPool } from './erc20-collateral-pool'

type Erc20CollateralTokenPoolDetail = Borrow | Lend

export { Abi, PrivateKey, Pool }

export class SelfProvider<
  T extends PoolsClass | ERC20CollateralPool
> extends BaseProvider<T> {
  constructor(
    contractBuilder: new (...args: BaseContractConstructorParams) => T,
    address: string,
    apiUrl: string,
    privateKey: PrivateKey,
    abi?: Abi
  ) {
    super(new contractBuilder(address, apiUrl, privateKey, abi))
  }

  getPool(poolId: bigint): Promise<Erc20CollateralPool | Pools> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  getPools(
    offset: bigint,
    limit: bigint
  ): Promise<Array<Erc20CollateralPool | Pools>> {
    throw new Error(
      `Method not implemented. ${offset.toString()}, ${limit.toString()}`
    )
  }

  getPoolDetails(
    poolId: bigint,
    walletAddress: string
  ): Promise<Erc20CollateralTokenPoolDetail | PoolCommit> {
    throw new Error(
      `Method not implemented. ${poolId.toString()}, ${walletAddress}`
    )
  }

  pause(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  unpause(): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
