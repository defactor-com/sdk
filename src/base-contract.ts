import { Contract, ethers } from 'ethers'

import { miscErc20CollateralPool } from './artifacts'
import {
  Borrow,
  PoolInput as ERC20CollateralPool,
  Lend
} from './types/erc20-collateral-token'
import { PoolCommit, Pool as PoolObject } from './types/pools'
import { Abi, PrivateKey } from './types/types'

export type BaseContractConstructorParams = ConstructorParameters<
  typeof BaseContract
>

export type Erc20CollateralTokenPoolDetail = Borrow | Lend

export type Pagination<T> = {
  data: Array<T>
  more: boolean
}

export interface Views {
  getPool(poolId: bigint): Promise<ERC20CollateralPool | PoolObject>

  getPools(
    offset: bigint,
    limit: bigint
  ): Promise<Pagination<ERC20CollateralPool | PoolObject>>

  getPoolDetails(
    poolId: bigint,
    walletAddress: string
  ): Promise<Erc20CollateralTokenPoolDetail | PoolCommit>
}

export interface AdminFunctions {
  pause(): Promise<void>
  unpause(): Promise<void>
}

export abstract class BaseContract {
  readonly address: string
  readonly jsonRpcProvider: ethers.JsonRpcProvider
  readonly abi: Abi
  readonly contract: Contract
  readonly signer: ethers.Wallet | null
  readonly apiUrl: string

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi: Abi
  ) {
    this.contract = new Contract(
      address,
      abi || miscErc20CollateralPool.abi,
      new ethers.JsonRpcProvider(apiUrl)
    )
    this.address = address
    this.jsonRpcProvider = new ethers.JsonRpcProvider(apiUrl)
    this.abi = abi
    this.apiUrl = apiUrl
    this.signer = privateKey
      ? new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(apiUrl))
      : null
  }
}
