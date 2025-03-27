import { ethers } from 'ethers'

import { Pagination } from '../types'

export type PoolAmounts = {
  lended: bigint
  claimed: bigint
  borrowed: bigint
  repaid: bigint
  rewards: bigint
  claimedRewards: bigint
  collateralTokenAmount: bigint
}

export type CollateralTokenDetails = {
  collateralToken: string
  collateralTokenPriceOracle: string
  collateralTokenSequencerOracle: string
  collateralTokenFactor: bigint
  collateralTokenLTVPercentage: bigint
}

export type CollateralConfiguration = {
  maxPoolCapacity: bigint
  minLended: bigint
  minBorrow: bigint
}

export type CollateralDetails = CollateralTokenDetails & CollateralConfiguration

export type Pool = {
  amounts: PoolAmounts
  collateralDetails: CollateralDetails
  rewardPerToken: bigint
  rewardRate: bigint
  lastUpdated: bigint
  endTime: bigint
  interest: bigint
}

export type InitPool = CollateralTokenDetails &
  CollateralConfiguration & {
    endTime: bigint
    interest: bigint
  }

export type EditPool = Omit<InitPool, 'collateralToken'>

export type PoolEditAnnouncement = {
  unlocksAt: bigint
  pool: EditPool
}

export type Borrow = {
  startingUsdcAmount: bigint
  usdcAmount: bigint
  collateralTokenAmount: bigint
  borrowTime: bigint
}

export type Lend = {
  startingUsdcAmount: bigint
  usdcAmount: bigint
  rewardPerTokenIgnored: bigint
}

export type Claim = {
  lendId: bigint
  usdcAmount: bigint
}

export type Liquidation = {
  borrowId: bigint
  user: string
  usdcAmount: bigint
}

export type AvailableAmounts = {
  availableUSDC: bigint
  availableCollateralTokens: bigint
}

export interface Constants {
  LIQUIDATION_PROTOCOL_FEE: bigint
  LIQUIDATION_FEE: bigint
  LIQUIDATION_MARGIN_FACTOR: bigint
  DAY_SEC: bigint
  ONE_YEAR: bigint
  BPS_DIVIDER: bigint
  MAX_LTV_PERCENTAGE: bigint
}

export interface Views {
  USDC_FEES_COLLECTED(): Promise<bigint>
  getUsdc(): Promise<string>
  getUsdcPriceOracle(): Promise<string>
  getUsdcSequencerOracle(): Promise<string>
  getTotalPools(): Promise<bigint>
  getTotalBorrowsByUser(poolId: bigint, address: string): Promise<bigint>
  getTotalLoansByUser(poolId: bigint, address: string): Promise<bigint>
  getUnpausedTime(): Promise<bigint>
  getAnnouncedPoolEdit(poolId: bigint): Promise<PoolEditAnnouncement>
  getPool(poolId: bigint): Promise<Pool>
  getPools(offset: bigint, limit: bigint): Promise<Pagination<Pool>>
  getLoan(poolId: bigint, address: string, lendingId: bigint): Promise<Lend>
  getLoansByLender(
    poolId: bigint,
    address: string,
    offset: bigint,
    limit: bigint
  ): Promise<Pagination<Lend>>
  getBorrow(poolId: bigint, address: string, borrowId: bigint): Promise<Borrow>
  getBorrowsByBorrower(
    poolId: bigint,
    address: string,
    offset: bigint,
    limit: bigint
  ): Promise<Pagination<Borrow>>
  getCollateralTokens(): Promise<Array<string>>
  getLiquidatableAmountWithProtocolFee(
    poolId: bigint,
    user: string,
    borrowId: bigint
  ): Promise<bigint>
  calculateRepayInterest(
    poolId: bigint,
    borrowId: bigint,
    user: string
  ): Promise<bigint>
  calculateCollateralTokenAmount(
    poolId: bigint,
    usdcAmount: bigint
  ): Promise<bigint>
  getCollateralTokenProtocolFee(collateralToken: string): Promise<bigint>
  getAvailableAmountsInPool(poolId: bigint): Promise<AvailableAmounts>
  isPositionLiquidatable(
    poolId: bigint,
    user: string,
    borrowId: bigint
  ): Promise<boolean>
  calculateReward(poolId: bigint, lendId: bigint, user: string): Promise<bigint>
  calculateRequiredUsdcToLiquidate(
    poolId: bigint,
    liquidations: Array<Liquidation>
  ): Promise<bigint>
  calculateRepayInterestAt(
    poolInterest: bigint,
    borrow: Borrow,
    usdcAmount: bigint,
    timestamp: bigint
  ): bigint
}

export interface AdminFunctions {
  addPool(
    pool: InitPool
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  announceEditPool(
    poolId: bigint,
    pool: EditPool
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  commitEditPool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  cancelEditPool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  withdrawProtocolRewards(
    token: string,
    recipient: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface Functions {
  lend(
    poolId: bigint,
    usdcAmount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  borrow(
    poolId: bigint,
    usdcAmount: bigint,
    collateralTokenAmount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  repay(
    poolId: bigint,
    borrowId: bigint,
    repayAmount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  claim(
    poolId: bigint,
    claims: Array<Claim>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  liquidate(
    poolId: bigint,
    liquidations: Array<Liquidation>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  changeCollateralAmount(
    poolId: bigint,
    borrowId: bigint,
    newCollateralTokenAmount: bigint,
    maxCollateralTokenLTVPercentage: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  claimCollateral(
    poolId: bigint,
    claims: Array<Claim>,
    liquidations: Array<Liquidation>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}
