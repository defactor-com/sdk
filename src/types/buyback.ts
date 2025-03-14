import { ethers } from 'ethers'

export type BuybackStruct = {
  timeLocked: bigint
  buyAmount: bigint
  spendAmount: bigint
  withdrawn: boolean
}

export type BuybackAmounts = {
  account: string
  bps: bigint
}

export type CustomBuybackStruct = BuybackStruct & {
  distributionArray: Array<BuybackAmounts>
}

export interface Functions {
  buyback(
    providedOptimalAmount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  buybackWithdraw(
    id: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  customBuyback(
    usdcAmount: bigint,
    distributionArray: Array<BuybackAmounts>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  customBuybackWithdraw(
    id: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  recoverERC20(
    token: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface Views {
  fetchActiveLocks(fromId: bigint): Promise<Array<BuybackStruct>>
  fetchActiveCustomLocks(fromId: bigint): Promise<Array<CustomBuybackStruct>>
  calculateOptimalAmount(
    path: string,
    pool1: string,
    pool2: string,
    usdcAmount: bigint
  ): Promise<bigint>
  estimateAmountOut(
    tokenIn: string,
    amountIn: bigint,
    tokenOut: string,
    secondsAgo: bigint,
    pool: string
  ): Promise<bigint>
  getOptimalTwapAmountThreshold(
    amountIn: bigint,
    pool1: string,
    pool2: string
  ): Promise<bigint>
}

export interface Constants {
  getVault1(): Promise<string>
  getVault2(): Promise<string>
  getVault3(): Promise<string>
  getVault4(): Promise<string>
  getUniswapFactory(): Promise<string>
  getUniswapRouter(): Promise<string>
  getFACTR(): Promise<string>
  getUSDC(): Promise<string>
  getWETH(): Promise<string>
  getPool1Fee(): Promise<bigint>
  getPool2Fee(): Promise<bigint>
  getBuyFrequency(): Promise<bigint>
  getMaxLiquiditySlippage(): Promise<bigint>
  getRecovererAddress(): Promise<string>
}
