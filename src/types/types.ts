import { ethers } from 'ethers'

import { ERC20CollateralPool } from '../pools/erc20-collateral-pool'
import { Pools } from '../pools/pools'
import { Staking } from '../staking/staking'

export type ERC20CollateralPoolConstructorParams = ConstructorParameters<
  typeof ERC20CollateralPool
>

export type PoolsConstructorParams = ConstructorParameters<typeof Pools>

export type StakingConstructorParams = ConstructorParameters<typeof Staking>

export type Abi = ethers.Interface | ethers.InterfaceAbi

export type PrivateKey = string | ethers.SigningKey

type BigIntToString<T> = {
  [K in keyof T]: T[K] extends bigint ? string : T[K]
}

export type WithoutBigInt<T> = BigIntToString<T>

export type Pagination<T> = {
  data: Array<T>
  more: boolean
}
