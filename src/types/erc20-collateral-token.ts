import { ethers } from 'ethers'

// TODO: use uint48 instead of number
export type Borrow = {
  amount: bigint
  collateralTokenAmount: bigint
  repayTime: number
  borrowTime: number
}

export type Lend = {
  amount: bigint
  rewardPerTokenIgnored: bigint
  claimed: boolean
}

// TODO: use uint8 instead of number for collateralTokenFactor and collateralTokenPercentage
export type CollateralDetails = {
  collateralToken: string
  collateralTokenChainlink: string
  collateralTokenFactor: number
  collateralTokenPercentage: number
}

// TODO: use uint8 instead of number
export type PoolInput = {
  endTime: number
  interest: number
  collateralDetails: CollateralDetails
}

// TODO: use uint48 instead of number for lastUpdated and endTime
// TODO: use uint8 instead of number for interest
export type Pool = {
  lended: bigint
  borrowed: bigint
  repaid: bigint
  rewards: bigint
  collateralTokenAmount: bigint
  liquidatedCollateral: bigint
  collateralTokenAmountAtLiquidation: bigint
  rewardPerToken: bigint
  rewardRate: bigint
  lastUpdated: number
  endTime: number
  collateralDetails: CollateralDetails
  interest: number
  liquidated: boolean
}

export interface Views {
  calculateRepayInterest(poolId: bigint, amount: bigint): Promise<bigint>
  calculateCollateralTokenAmount(
    poolId: bigint,
    amount: bigint
  ): Promise<bigint>
}

export interface Functions {
  addPool(pool: PoolInput): Promise<void>
  lend(
    poolId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  borrow(
    poolId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  repay(poolId: bigint, amount: bigint): Promise<void>
  claimRewards(poolId: bigint, lendingId: bigint): Promise<void>
  claimMultiple(poolId: bigint): Promise<void>
  claimUnliquidatedCollateral(poolId: bigint, borrowId: bigint): Promise<void>
  liquidatePool(poolId: bigint): Promise<void>
}

export const poolKeys: Array<keyof Pool> = [
  'lended',
  'borrowed',
  'repaid',
  'rewards',
  'collateralTokenAmount',
  'liquidatedCollateral',
  'collateralTokenAmountAtLiquidation',
  'rewardPerToken',
  'rewardRate',
  'lastUpdated',
  'endTime',
  'collateralDetails',
  'interest',
  'liquidated'
]

export const collateralDetailsKeys: Array<keyof CollateralDetails> = [
  'collateralToken',
  'collateralTokenChainlink',
  'collateralTokenFactor',
  'collateralTokenPercentage'
]

export const lendingKeys: Array<keyof Lend> = [
  'amount',
  'rewardPerTokenIgnored',
  'claimed'
]
