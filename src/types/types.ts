import { ethers } from 'ethers'

import { Buyback } from '../buyback'
import { ERC20CollateralPool } from '../pools/erc20-collateral-pool'
import { Pools } from '../pools/pools'
import { Staking } from '../staking/staking'
import { Role } from '../utilities/util'
import { Vesting } from '../vesting'

export type ERC20CollateralPoolConstructorParams = ConstructorParameters<
  typeof ERC20CollateralPool
>

export type PoolsConstructorParams = ConstructorParameters<typeof Pools>

export type StakingConstructorParams = ConstructorParameters<typeof Staking>

export type BuybackConstructorParams = ConstructorParameters<typeof Buyback>

export type VestingConstructorParams = ConstructorParameters<typeof Vesting>

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

export type RoleOption = (typeof Role)[keyof typeof Role]
