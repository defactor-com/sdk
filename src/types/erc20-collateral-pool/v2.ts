import { ethers } from 'ethers'

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
  getUnpausedTime(): Promise<bigint>
}

export interface AdminFunctions {
  addPool(
    pool: InitPool
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface Functions {}
