import { ethers } from 'ethers'

import { ERC20CollateralPool } from '../erc20-collateral-pool'
import { Pools } from '../pools'

export type ERC20CollateralPoolConstructorParams = ConstructorParameters<
  typeof ERC20CollateralPool
>

export type PoolsConstructorParams = ConstructorParameters<typeof Pools>

export type Abi = ethers.Interface | ethers.InterfaceAbi

export type PrivateKey = string | ethers.SigningKey

type BigIntToString<T> = {
  [K in keyof T]: T[K] extends bigint ? string : T[K]
}

export type WithoutBigInt<T> = BigIntToString<T>
