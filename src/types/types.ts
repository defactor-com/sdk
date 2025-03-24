import { ethers } from 'ethers'

import { Buyback } from '../buyback'
import { Pools } from '../pools/pools'
import { ERC20CollateralPool } from '../pools/v1.erc20-collateral-pool'
import { StakingV1, StakingV2 } from '../staking'
import { Role } from '../utilities/util'
import { Vesting } from '../vesting'

export type ERC20CollateralPoolConstructorParams = ConstructorParameters<
  typeof ERC20CollateralPool
>

export type PoolsConstructorParams = ConstructorParameters<typeof Pools>

export type StakingConstructorParams = ConstructorParameters<
  typeof StakingV1 | typeof StakingV2
>

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
