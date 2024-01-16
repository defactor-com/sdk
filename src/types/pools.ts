export type PoolCommit = {
  amount: bigint
  claimedAmount: bigint
}

export type CollateralToken = {
  contractAddress: string
  amount: bigint
  id: bigint
}

// TODO: use uint48 instead of bigint
export type Pool = {
  softCap: bigint
  hardCap: bigint
  deadline: bigint
  collateralTokens: Array<CollateralToken>
}

export interface Functions {
  createPool(pool: Pool): Promise<void>
  collectPool(poolId: bigint): Promise<void>
  depositRewards(poolId: bigint, amount: bigint): Promise<void>
  closePool(poolId: bigint): Promise<void>
  archivePool(poolId: bigint): Promise<void>
  commitToPool(poolId: bigint, amount: bigint): Promise<void>
  uncommitFromPool(poolId: bigint): Promise<void>
  claim(poolId: bigint): Promise<void>
}
