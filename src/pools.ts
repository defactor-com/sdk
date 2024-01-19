import { Abi, PrivateKey } from './types/types'
import { BaseContract, Erc20CollateralTokenPoolDetail } from './base-contract'
import { Pool as Erc20CollateralPool } from './types/erc20-collateral-token'
import { Pool as PoolsObject, PoolCommit } from './types/pools'

export class Pools extends BaseContract {
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi)
  }

  getPool(poolId: bigint): Promise<Erc20CollateralPool | PoolsObject> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  getPools(
    offset: bigint,
    limit: bigint
  ): Promise<Array<Erc20CollateralPool | PoolsObject>> {
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
