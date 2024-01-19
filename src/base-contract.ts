import { ethers, Contract } from 'ethers'

import { miscErc20CollateralPool } from './artifacts'
import { Abi, PrivateKey } from './types/types'
import {
  Pool as Erc20CollateralPool,
  Borrow,
  Lend
} from './types/erc20-collateral-token'
import { Pool as Pools, PoolCommit } from './types/pools'

export type BaseContractConstructorParams = ConstructorParameters<
  typeof BaseContract
>

export type Erc20CollateralTokenPoolDetail = Borrow | Lend

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

export abstract class BaseContract implements Views, AdminFunctions {
  readonly address: string
  readonly jsonRpcProvider: ethers.JsonRpcProvider
  readonly abi: Abi
  readonly contract: Contract
  readonly signer: ethers.Wallet | null

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    this.contract = new Contract(
      address,
      abi || miscErc20CollateralPool.abi,
      new ethers.JsonRpcProvider(apiUrl)
    )
    this.address = address
    this.jsonRpcProvider = new ethers.JsonRpcProvider(apiUrl)
    this.abi = abi || miscErc20CollateralPool.abi
    this.signer = privateKey
      ? new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(apiUrl))
      : null
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
