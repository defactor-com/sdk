import { ContractTransaction, TransactionResponse, ethers } from 'ethers'

import { miscStaking } from '../artifacts'
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

export class Buyback
  extends CoreContract
  implements Functions, Views, Constants
{
  readonly ONE_HUNDRED = BigInt(100)
  readonly THREE_HUNDRED = BigInt(300)
  readonly ONE_THOUSAND = BigInt(1_000)
  readonly TEN_THOUSAND = BigInt(10_000)

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscStaking.abi)
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

  async fetchActiveLocks(fromId: bigint): Promise<Array<BuybackStruct>> {
    if (fromId < 0) {
      throw new Error(buybackErrorMessage.nonNegativeBuybackId)
    }

    return await this.contract.fetchActiveLocks(fromId)
  }

  async fetchActiveCustomLocks(
    fromId: bigint
  ): Promise<Array<CustomBuybackStruct>> {
    if (fromId < 0) {
      throw new Error(buybackErrorMessage.nonNegativeBuybackId)
    }

    return await this.contract.fetchActiveCustomLocks(fromId)
  }

  async calculateOptimalAmount(
    pool1: string,
    pool2: string,
    usdcAmount: bigint
  ): Promise<bigint> {
    if (usdcAmount <= 0) {
      throw new Error(buybackErrorMessage.noNegativeAmountOrZero)
    }

    if (!ethers.isAddress(pool1) || !ethers.isAddress(pool2)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.calculateOptimalAmount(pool1, pool2, usdcAmount)
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
      throw new Error(buybackErrorMessage.noNegativeAmountOrZero)
    }

    if (secondsAgo <= 0) {
      throw new Error(buybackErrorMessage.noNegativeSecondsOrZero)
    }

    return await this.contract.estimateAmountOut(
      tokenIn,
      amountIn,
      tokenOut,
      secondsAgo,
      pool
    )
  }

  async buyback(): Promise<ContractTransaction | TransactionResponse> {
    const pop = await this.contract.buyback.populateTransaction()

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async buybackWithdraw(
    id: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    if (id < 0) {
      throw new Error(buybackErrorMessage.nonNegativeBuybackId)
    }

    const pop = await this.contract.buybackWithdraw.populateTransaction(id)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async customBuyback(
    usdcAmount: bigint,
    collectionArray: Array<BuybackAmounts>,
    distributionArray: Array<BuybackAmounts>
  ): Promise<ContractTransaction | TransactionResponse> {
    if (usdcAmount <= 0) {
      throw new Error(buybackErrorMessage.noNegativeAmountOrZero)
    }

    for (const buybackAmount of collectionArray.concat(distributionArray)) {
      if (!ethers.isAddress(buybackAmount.account)) {
        throw new Error(commonErrorMessage.wrongAddressFormat)
      }

      if (buybackAmount.bps < 0) {
        throw new Error(buybackErrorMessage.noNegativeBps)
      }
    }

    const pop = await this.contract.customBuyback.populateTransaction(
      usdcAmount,
      collectionArray,
      distributionArray
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async customBuybackWithdraw(
    id: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    if (id < 0) {
      throw new Error(buybackErrorMessage.nonNegativeBuybackId)
    }

    const pop =
      await this.contract.customBuybackWithdraw.populateTransaction(id)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async recoverERC20(
    address: string
  ): Promise<ContractTransaction | TransactionResponse> {
    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    const pop = await this.contract.recoverERC20.populateTransaction(address)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
