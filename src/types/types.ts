import { ethers } from 'ethers'

import { Buyback } from '../buyback'
import { ERC20CollateralPoolV1, ERC20CollateralPoolV2, Pools } from '../pools'
import { StakingV1, StakingV2 } from '../staking'
import { Role } from '../utilities/util'
import { Vesting } from '../vesting'

export type ERC20CollateralPoolConstructorParams = ConstructorParameters<
  typeof ERC20CollateralPoolV1 | typeof ERC20CollateralPoolV2
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
