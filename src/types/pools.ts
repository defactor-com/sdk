import { ethers } from 'ethers'

import { ERC20CollateralPool } from '../pools'
import { Erc20CollateralTokenPoolDetail } from './erc20-collateral-token'
import { Pagination } from './types'

export const PoolStatusOption = {
  CREATED: 'CREATED',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED'
} as const

export type PoolStatus =
  (typeof PoolStatusOption)[keyof typeof PoolStatusOption]

export type PoolCommit = {
  amount: bigint
  claimedAmount: bigint
}

export type CollateralToken = {
  contractAddress: string
  amount: bigint
  id: bigint | null
}

export type PoolInput = {
  softCap: bigint
  hardCap: bigint
  deadline: bigint
  minimumAPR: bigint
  collateralTokens: Array<CollateralToken>
}

export type Pool = Omit<ContractPool, 'poolStatus'> & {
  poolStatus: PoolStatus
}

export type ContractPool = {
  softCap: bigint
  hardCap: bigint
  totalCommitted: bigint
  totalRewards: bigint
  rewardsPaidOut: bigint
  createdAt: bigint
  deadline: bigint
  minimumAPR: bigint
  closedTime: bigint
  poolStatus: bigint
  poolOwner: string
  collateralTokens: Array<CollateralToken>
}

export interface AdminFunctions {
  pause(): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  unpause(): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface Functions {
  createPool(
    pool: PoolInput
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  collectPool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  depositRewards(
    poolId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  closePool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  archivePool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  commitToPool(
    poolId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  uncommitFromPool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  claim(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface PoolViews {
  getPool(poolId: bigint): Promise<ERC20CollateralPool | Pool>

  getPools(
    offset: bigint,
    limit: bigint
  ): Promise<Pagination<ERC20CollateralPool | Pool>>

  getPoolDetails(
    poolId: bigint,
    walletAddress: string
  ): Promise<Erc20CollateralTokenPoolDetail | PoolCommit>
}
