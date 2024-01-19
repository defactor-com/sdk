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

// TODO: use uint8 instead of number
export type Pool = {
  endTime: number
  collateralToken: string
  collateralTokenChainlink: string
  collateralTokenFactor: number
  collateralTokenPercentage: number
  interest: number
}

export interface Views {
  calculateRepayInterest(poolId: bigint, amount: bigint): Promise<bigint>
  calculateCollateralTokenAmount(
    poolId: bigint,
    amount: bigint
  ): Promise<bigint>
}

export interface Functions {
  addPool(pool: Pool): Promise<void>
  lend(poolId: bigint, amount: bigint): Promise<void>
  borrow(poolId: bigint, amount: bigint): Promise<void>
  repay(poolId: bigint, amount: bigint): Promise<void>
  claimRewards(poolId: bigint, lendingId: bigint): Promise<void>
  claimMultiple(poolId: bigint): Promise<void>
  claimUnliquidatedCollateral(poolId: bigint, borrowId: bigint): Promise<void>
  liquidatePool(poolId: bigint): Promise<void>
}
