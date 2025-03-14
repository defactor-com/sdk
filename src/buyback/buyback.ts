import { ContractTransaction, TransactionResponse, ethers } from 'ethers'

import { miscBuyback } from '../artifacts'
import { CoreContract } from '../base-classes'
import { buybackErrorMessage, commonErrorMessage } from '../errors'
import {
  BuybackAmounts,
  BuybackStruct,
  Constants,
  CustomBuybackStruct,
  Functions,
  Views
} from '../types/buyback'
import { Abi, PrivateKey } from '../types/types'
import { Erc20 } from '../utilities/erc20'
import { getUnixEpochTime } from '../utilities/util'

export class Buyback
  extends CoreContract
  implements Functions, Views, Constants
{
  readonly ONE_HUNDRED = BigInt(100)
  readonly THREE_HUNDRED = BigInt(300)
  readonly ONE_THOUSAND = BigInt(1_000)
  readonly TEN_THOUSAND = BigInt(10_000)
  private USDC: Erc20 | undefined
  protected readonly ONE_DAY_SEC = BigInt(86400)
  protected readonly ONE_YEAR_SEC = this.ONE_DAY_SEC * BigInt(365)

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscBuyback.abi)
  }

  private async _getUsdcContract(): Promise<Erc20> {
    if (!this.USDC) {
      const address = await this.getUSDC()

      this.USDC = new Erc20(address, this.apiUrl, null)
    }

    return this.USDC
  }

  async getVault1(): Promise<string> {
    return await this.contract.vault1()
  }

  async getVault2(): Promise<string> {
    return await this.contract.vault2()
  }

  async getVault3(): Promise<string> {
    return await this.contract.vault3()
  }

  async getVault4(): Promise<string> {
    return await this.contract.vault4()
  }

  async getUniswapFactory(): Promise<string> {
    return await this.contract.uniswapFactory()
  }

  async getUniswapRouter(): Promise<string> {
    return await this.contract.uniswapRouter()
  }

  async getFACTR(): Promise<string> {
    return await this.contract.FACTR()
  }

  async getUSDC(): Promise<string> {
    return await this.contract.USDC()
  }

  async getWETH(): Promise<string> {
    return await this.contract.WETH()
  }

  async getPool1Fee(): Promise<bigint> {
    return await this.contract.POOL_1_FEE()
  }

  async getPool2Fee(): Promise<bigint> {
    return await this.contract.POOL_2_FEE()
  }

  async getBuyFrequency(): Promise<bigint> {
    return await this.contract.BUY_FREQUENCY()
  }

  async getMaxLiquiditySlippage(): Promise<bigint> {
    return await this.contract.MAX_LIQUIDITY_SLIPPAGE()
  }

  async getRecovererAddress(): Promise<string> {
    return await this.contract.RECOVERER()
  }

  protected async _getBuybackById(
    buybackId: bigint
  ): Promise<BuybackStruct | null> {
    if (buybackId < BigInt(0) || buybackId >= BigInt(1) << BigInt(256)) {
      return null
    }

    const buyback: BuybackStruct = await this.contract.buybacks(buybackId)

    if (!buyback.timeLocked || !buyback.buyAmount) {
      return null
    }

    return {
      buyAmount: buyback.buyAmount,
      spendAmount: buyback.spendAmount,
      timeLocked: buyback.timeLocked,
      withdrawn: buyback.withdrawn
    }
  }

  async getBuyback(buybackId: bigint) {
    const buyback = await this._getBuybackById(buybackId)

    if (!buyback) {
      throw new Error(buybackErrorMessage.nonExistBuybackId(buybackId))
    }

    return buyback
  }

  protected async _getCustomBuybackById(
    buybackId: bigint
  ): Promise<CustomBuybackStruct | null> {
    if (buybackId < BigInt(0) || buybackId >= BigInt(1) << BigInt(256)) {
      return null
    }

    const customBuyback: CustomBuybackStruct =
      await this.contract.customBuybacks(buybackId)

    if (!customBuyback.timeLocked) {
      return null
    }

    return {
      buyAmount: customBuyback.buyAmount,
      spendAmount: customBuyback.spendAmount,
      timeLocked: customBuyback.timeLocked,
      withdrawn: customBuyback.withdrawn,
      distributionArray: customBuyback.distributionArray
    }
  }

  async getCustomBuyback(buybackId: bigint) {
    const customBuyback = await this._getCustomBuybackById(buybackId)

    if (!customBuyback) {
      throw new Error(buybackErrorMessage.nonExistCustomBuybackId(buybackId))
    }

    return customBuyback
  }

  async fetchActiveLocks(fromId: bigint): Promise<Array<BuybackStruct>> {
    if (fromId < 0) {
      throw new Error(buybackErrorMessage.nonNegativeBuybackId)
    }

    await this.getBuyback(fromId)

    return await this.contract.fetchActiveLocks(fromId)
  }

  async fetchActiveCustomLocks(
    fromId: bigint
  ): Promise<Array<CustomBuybackStruct>> {
    if (fromId < 0) {
      throw new Error(buybackErrorMessage.nonNegativeBuybackId)
    }

    await this.getCustomBuyback(fromId)

    return await this.contract.fetchActiveCustomLocks(fromId)
  }

  async calculateOptimalAmount(
    path: string,
    pool1: string,
    pool2: string,
    usdcAmount: bigint
  ): Promise<bigint> {
    if (usdcAmount <= 0) {
      throw new Error(buybackErrorMessage.nonNegativeAmountOrZero)
    }

    if (!ethers.isAddress(pool1) || !ethers.isAddress(pool2)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.calculateOptimalAmount(
      path,
      pool1,
      pool2,
      usdcAmount
    )
  }

  async estimateAmountOut(
    tokenIn: string,
    amountIn: bigint,
    tokenOut: string,
    secondsAgo: bigint,
    pool: string
  ): Promise<bigint> {
    if (
      !ethers.isAddress(tokenIn) ||
      !ethers.isAddress(tokenOut) ||
      !ethers.isAddress(pool)
    ) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (amountIn <= 0) {
      throw new Error(buybackErrorMessage.nonNegativeAmountOrZero)
    }

    if (amountIn >= BigInt(1) << BigInt(128)) {
      throw new Error(commonErrorMessage.nonGreaterThan('amountIn', '128 bits'))
    }

    if (secondsAgo <= 0) {
      throw new Error(buybackErrorMessage.nonNegativeSecondsOrZero)
    }

    if (secondsAgo >= BigInt(1) << BigInt(32)) {
      throw new Error(
        commonErrorMessage.nonGreaterThan('secondsAgo', '32 bits')
      )
    }

    return await this.contract.estimateAmountOut(
      tokenIn,
      amountIn,
      tokenOut,
      secondsAgo,
      pool
    )
  }

  async getOptimalTwapAmountThreshold(
    amountIn: bigint,
    pool1: string,
    pool2: string
  ): Promise<bigint> {
    if (!ethers.isAddress(pool1) || !ethers.isAddress(pool2)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (amountIn <= 0) {
      throw new Error(buybackErrorMessage.nonNegativeAmountOrZero)
    }

    return await this.contract.getOptimalTwapAmountThreshold(
      amountIn,
      pool1,
      pool2
    )
  }

  async buyback(
    providedOptimalAmount: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    const usdcContract = await this._getUsdcContract()
    const decimals = await usdcContract.decimals()
    const usdcBalance = await usdcContract.balanceOf(this.address)

    if (usdcBalance < this.ONE_THOUSAND * BigInt(10) ** decimals) {
      throw new Error(buybackErrorMessage.buybackConstraint)
    }

    const pop = await this.contract.buyback.populateTransaction(
      providedOptimalAmount
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async buybackWithdraw(
    id: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    const buyback = await this.getBuyback(id)

    if (buyback.withdrawn) {
      throw new Error(buybackErrorMessage.alreadyWithdrawn)
    }

    if (buyback.timeLocked + this.ONE_YEAR_SEC >= getUnixEpochTime()) {
      throw new Error(buybackErrorMessage.unlockPeriodNotFinished)
    }

    const pop = await this.contract.buybackWithdraw.populateTransaction(id)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async customBuyback(
    usdcAmount: bigint,
    distributionArray: Array<BuybackAmounts>
  ): Promise<ContractTransaction | TransactionResponse> {
    if (usdcAmount <= 0) {
      throw new Error(buybackErrorMessage.nonNegativeAmountOrZero)
    }

    if (usdcAmount >= BigInt(1) << BigInt(256)) {
      throw new Error(
        commonErrorMessage.nonGreaterThan('usdcAmount', '256 bits')
      )
    }

    const usdcContract = await this._getUsdcContract()
    const decimals = await usdcContract.decimals()

    if (usdcAmount < this.ONE_THOUSAND * BigInt(10) ** decimals) {
      throw new Error(buybackErrorMessage.buybackConstraint)
    }

    let distributionBpsSum = BigInt(0)

    for (const buybackAmount of distributionArray) {
      if (!ethers.isAddress(buybackAmount.account)) {
        throw new Error(commonErrorMessage.wrongAddressFormat)
      }

      if (buybackAmount.bps <= BigInt(0)) {
        throw new Error(buybackErrorMessage.nonNegativeOrZeroBps)
      }

      distributionBpsSum += buybackAmount.bps
    }

    if (distributionBpsSum !== this.TEN_THOUSAND) {
      throw new Error(buybackErrorMessage.distributionBpsConstraint)
    }

    const pop = await this.contract.customBuyback.populateTransaction(
      usdcAmount,
      distributionArray
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async customBuybackWithdraw(
    id: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    const customBuyback = await this.getCustomBuyback(id)

    if (customBuyback.withdrawn) {
      throw new Error(buybackErrorMessage.alreadyWithdrawn)
    }

    if (customBuyback.timeLocked + this.ONE_YEAR_SEC >= getUnixEpochTime()) {
      throw new Error(buybackErrorMessage.unlockPeriodNotFinished)
    }

    const pop =
      await this.contract.customBuybackWithdraw.populateTransaction(id)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async recoverERC20(
    token: string
  ): Promise<ContractTransaction | TransactionResponse> {
    if (!ethers.isAddress(token)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (this.signer) {
      const recoverer = await this.getRecovererAddress()

      if (this.signer.address !== recoverer) {
        throw new Error(buybackErrorMessage.addressIsNotRecoverer)
      }
    }

    const factr = await this.getFACTR()
    const usdc = await this.getUSDC()

    if (token === factr || token === usdc) {
      throw new Error(commonErrorMessage.invalidToken)
    }

    const pop = await this.contract.recoverERC20.populateTransaction(token)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
