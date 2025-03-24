import { ethers } from 'ethers'

import { miscErc20CollateralPoolV2 } from '../artifacts'
import { BaseContract } from '../base-classes'
import {
  commonErrorMessage,
  erc20CollateralPoolV2ErrorMessage as ecpErrorMessage,
  poolCommonErrorMessage
} from '../errors'
import {
  AdminFunctions,
  Constants,
  EditPool,
  Functions,
  InitPool,
  Pool,
  PoolEditAnnouncement,
  Views
} from '../types/erc20-collateral-pool/v2'
import { Abi, PrivateKey } from '../types/types'
import { getUnixEpochTime } from '../utilities/util'

export class ERC20CollateralPoolV2
  extends BaseContract
  implements Constants, Functions, Views, AdminFunctions
{
  readonly LIQUIDATION_PROTOCOL_FEE = BigInt(5_00)
  readonly LIQUIDATION_FEE = BigInt(10_00)
  readonly LIQUIDATION_MARGIN_FACTOR = BigInt(20_00)
  readonly DAY_SEC = BigInt(60 * 60 * 24)
  readonly ONE_YEAR = BigInt(365) * this.DAY_SEC
  readonly BPS_DIVIDER = BigInt(100_00)
  readonly MAX_LTV_PERCENTAGE = BigInt(65_00)

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscErc20CollateralPoolV2.abi)
  }

  async USDC_FEES_COLLECTED(): Promise<bigint> {
    return await this.contract.usdcFeesCollected()
  }

  async getUsdc(): Promise<string> {
    return await this.contract.USDC()
  }

  async getUsdcPriceOracle(): Promise<string> {
    return await this.contract.usdcPriceOracle()
  }

  async getUsdcSequencerOracle(): Promise<string> {
    return await this.contract.usdcSequencerOracle()
  }

  async getTotalPools(): Promise<bigint> {
    return await this.contract.poolsLength()
  }

  async getUnpausedTime(): Promise<bigint> {
    return await this.contract.unPausedTimestamp()
  }

  async getAnnouncedPoolEdit(poolId: bigint): Promise<PoolEditAnnouncement> {
    return await this.contract.announcedPoolEdit(poolId)
  }

  async getCollateralTokens(): Promise<Array<string>> {
    return await this.contract.getCollateralTokens()
  }

  private async _checkPoolId(poolId: bigint) {
    if (poolId < 0) {
      throw new Error(commonErrorMessage.nonNegativeValue)
    }

    const totalPools = await this.getTotalPools()

    if (poolId >= totalPools) {
      throw new Error(poolCommonErrorMessage.noExistPoolId(poolId))
    }
  }

  async getPool(poolId: bigint): Promise<Pool> {
    await this._checkPoolId(poolId)

    return await this.contract.pools(poolId)
  }

  private _validatePoolInput(pool: InitPool | EditPool) {
    if (
      'collateralToken' in pool &&
      (!ethers.isAddress(pool.collateralToken) ||
        pool.collateralToken === ethers.ZeroAddress)
    ) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (
      !ethers.isAddress(pool.collateralTokenPriceOracle) ||
      !ethers.isAddress(pool.collateralTokenSequencerOracle)
    ) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (pool.endTime < getUnixEpochTime()) {
      throw new Error(ecpErrorMessage.timeMustBeInFuture)
    }

    if (pool.maxPoolCapacity < pool.minLended) {
      throw new Error(ecpErrorMessage.minLentMustBeLessThanMaxPoolCapacity)
    }

    if (pool.minBorrow <= 0 || pool.minLended <= 0) {
      throw new Error(ecpErrorMessage.amountTooLow)
    }

    if (pool.collateralTokenLTVPercentage > this.MAX_LTV_PERCENTAGE) {
      throw new Error(ecpErrorMessage.collateralTokenLTVTooHigh)
    }

    if (pool.collateralTokenLTVPercentage <= 0) {
      throw new Error(ecpErrorMessage.nonNegativeOrZeroCollateralTokenLTV)
    }

    if (
      pool.endTime < 0 ||
      pool.collateralTokenFactor < 0 ||
      pool.interest < 0 ||
      pool.maxPoolCapacity < 0
    ) {
      throw new Error(commonErrorMessage.nonNegativeValue)
    }
  }

  async addPool(
    pool: InitPool
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsAdmin()

    this._validatePoolInput(pool)

    const formattedPool = {
      collateralToken: pool.collateralToken,
      collateralTokenPriceOracle: pool.collateralTokenPriceOracle,
      collateralTokenSequencerOracle: pool.collateralTokenSequencerOracle,
      maxPoolCapacity: pool.maxPoolCapacity,
      minLended: pool.minLended,
      minBorrow: pool.minBorrow,
      endTime: pool.endTime,
      collateralTokenFactor: pool.collateralTokenFactor,
      collateralTokenLTVPercentage: pool.collateralTokenLTVPercentage,
      interest: pool.interest
    }

    const pop = await this.contract.addPool.populateTransaction(formattedPool)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async announceEditPool(
    poolId: bigint,
    pool: EditPool
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    this._validatePoolInput(pool)

    await this._checkIsAdmin()
    await this._checkPoolId(poolId)

    const announcement = await this.getAnnouncedPoolEdit(poolId)

    if (announcement.unlocksAt > 0) {
      throw new Error(ecpErrorMessage.editAnnouncementAlreadyDone)
    }

    const formattedPool = {
      collateralTokenPriceOracle: pool.collateralTokenPriceOracle,
      collateralTokenSequencerOracle: pool.collateralTokenSequencerOracle,
      maxPoolCapacity: pool.maxPoolCapacity,
      minLended: pool.minLended,
      minBorrow: pool.minBorrow,
      endTime: pool.endTime,
      collateralTokenFactor: pool.collateralTokenFactor,
      collateralTokenLTVPercentage: pool.collateralTokenLTVPercentage,
      interest: pool.interest
    }

    const pop = await this.contract.announceEditPool.populateTransaction(
      poolId,
      formattedPool
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async cancelEditPool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsAdmin()
    await this._checkPoolId(poolId)

    const announcement = await this.getAnnouncedPoolEdit(poolId)

    if (announcement.unlocksAt <= 0) {
      throw new Error(ecpErrorMessage.poolAnnouncementIsLocked)
    }

    const pop = await this.contract.cancelEditPool.populateTransaction(poolId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async commitEditPool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsAdmin()
    await this._checkPoolId(poolId)

    const announcement = await this.getAnnouncedPoolEdit(poolId)

    if (
      announcement.unlocksAt <= 0 ||
      announcement.unlocksAt > getUnixEpochTime()
    ) {
      throw new Error(ecpErrorMessage.poolAnnouncementIsLocked)
    }

    const pop = await this.contract.commitEditPool.populateTransaction(poolId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async withdrawProtocolRewards(
    token: string,
    recipient: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (
      !ethers.isAddress(token) ||
      !ethers.isAddress(recipient) ||
      recipient === ethers.ZeroAddress
    ) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    const collaterals = await this.getCollateralTokens()
    const usdc = await this.getUsdc()

    if (!collaterals.includes(token) || token !== usdc) {
      throw new Error(ecpErrorMessage.collateralTokenDoesNotExist)
    }

    const pop = await this.contract.withdrawProtocolRewards.populateTransaction(
      token,
      recipient
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
