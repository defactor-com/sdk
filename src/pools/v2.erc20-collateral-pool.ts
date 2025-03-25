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
  AvailableAmounts,
  Borrow,
  Claim,
  Constants,
  EditPool,
  Functions,
  InitPool,
  Lend,
  Liquidation,
  Pool,
  PoolEditAnnouncement,
  Views
} from '../types/erc20-collateral-pool/v2'
import { Abi, Pagination, PrivateKey } from '../types/types'
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

  private async _getList<T>(
    offset: bigint,
    limit: bigint,
    total: bigint,
    getFunction: (id: bigint) => Promise<T>
  ) {
    if (offset < 0) {
      throw new Error(ecpErrorMessage.noNegativeOffset)
    }

    if (limit <= 0) {
      throw new Error(ecpErrorMessage.noNegativeLimitOrZero)
    }

    // TODO: consider taking this parameter (1000) from a configuration file or some configurable approach
    if (Math.min(Number(limit), Math.max(Number(total - offset), 0)) > 1000) {
      throw new Error(ecpErrorMessage.maxLimitAllowed)
    }

    const promises = []

    for (let i = offset; i < offset + limit && i < total; i++) {
      promises.push(getFunction(i))
    }

    return {
      data: await Promise.all(promises),
      more: offset + limit < total
    }
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

  async getPools(offset: bigint, limit: bigint): Promise<Pagination<Pool>> {
    const totalPools = await this.getTotalPools()
    const pools = await this._getList<Pool>(
      offset,
      limit,
      totalPools,
      this.contract.pools as (id: bigint) => Promise<Pool>
    )

    return pools
  }

  async getTotalLoansByUser(poolId: bigint, address: string): Promise<bigint> {
    await this._checkPoolId(poolId)

    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.lendingsLength(poolId, address)
  }

  private async _checkLoanId(poolId: bigint, loanId: bigint, address: string) {
    if (loanId < 0) {
      throw new Error(commonErrorMessage.nonNegativeValue)
    }

    const total = await this.getTotalLoansByUser(poolId, address)

    if (loanId >= total) {
      throw new Error(ecpErrorMessage.noExistLendingId(poolId))
    }
  }

  async getLoan(
    poolId: bigint,
    address: string,
    lendingId: bigint
  ): Promise<Lend> {
    await this._checkLoanId(poolId, lendingId, address)

    return await this.contract.lendings(poolId, address, lendingId)
  }

  async getLoansByLender(
    poolId: bigint,
    address: string,
    offset: bigint,
    limit: bigint
  ): Promise<Pagination<Lend>> {
    const totalLoansByUser = await this.getTotalLoansByUser(poolId, address)
    const getLoan = (id: bigint) => this.contract.lendings(poolId, address, id)
    const lendings = await this._getList<Lend>(
      offset,
      limit,
      totalLoansByUser,
      getLoan
    )

    return lendings
  }

  async getTotalBorrowsByUser(
    poolId: bigint,
    address: string
  ): Promise<bigint> {
    await this._checkPoolId(poolId)

    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.borrowsLength(poolId, address)
  }

  private async _checkBorrowId(
    poolId: bigint,
    borrowId: bigint,
    address: string
  ) {
    if (borrowId < 0) {
      throw new Error(commonErrorMessage.nonNegativeValue)
    }

    const total = await this.getTotalBorrowsByUser(poolId, address)

    if (borrowId >= total) {
      throw new Error(ecpErrorMessage.noExistBorrowId(poolId))
    }
  }

  async getBorrow(
    poolId: bigint,
    address: string,
    borrowId: bigint
  ): Promise<Borrow> {
    await this._checkBorrowId(poolId, borrowId, address)

    return await this.contract.borrows(poolId, address, borrowId)
  }

  async getBorrowsByBorrower(
    poolId: bigint,
    address: string,
    offset: bigint,
    limit: bigint
  ): Promise<Pagination<Borrow>> {
    const totalBorrowsByUser = await this.getTotalBorrowsByUser(poolId, address)
    const getBorrow = (id: bigint) => this.contract.borrows(poolId, address, id)
    const borrows = await this._getList<Borrow>(
      offset,
      limit,
      totalBorrowsByUser,
      getBorrow
    )

    return borrows
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

  async getLiquidatableAmountWithProtocolFee(
    poolId: bigint,
    user: string,
    borrowId: bigint
  ): Promise<bigint> {
    if (!ethers.isAddress(user)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    await this._checkBorrowId(poolId, borrowId, user)

    return await this.contract.getLiquidatableAmountWithProtocolFee.staticCall(
      poolId,
      user,
      borrowId
    )
  }

  async calculateRepayInterest(
    poolId: bigint,
    borrowId: bigint,
    user: string
  ): Promise<bigint> {
    if (!ethers.isAddress(user)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    await this._checkBorrowId(poolId, borrowId, user)

    return await this.contract.calculateRepayInterest.staticCall(
      poolId,
      borrowId,
      user
    )
  }

  async calculateCollateralTokenAmount(
    poolId: bigint,
    usdcAmount: bigint
  ): Promise<bigint> {
    if (usdcAmount <= 0) {
      throw new Error(ecpErrorMessage.nonNegativeOrZero)
    }

    await this._checkPoolId(poolId)

    return await this.contract.calculateCollateralTokenAmount.staticCall(
      poolId,
      usdcAmount
    )
  }

  async getCollateralTokenProtocolFee(
    collateralToken: string
  ): Promise<bigint> {
    if (!ethers.isAddress(collateralToken)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.getCollateralTokenProtocolFee.staticCall(
      collateralToken
    )
  }

  async getAvailableAmountsInPool(poolId: bigint): Promise<AvailableAmounts> {
    await this._checkPoolId(poolId)

    return await this.contract.getAvailableAmountsInPool.staticCall(poolId)
  }

  async isPositionLiquidatable(
    poolId: bigint,
    user: string,
    borrowId: bigint
  ): Promise<boolean> {
    await this._checkBorrowId(poolId, borrowId, user)

    if (!ethers.isAddress(user)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.isPositionLiquidatable.staticCall(
      poolId,
      user,
      borrowId
    )
  }

  async calculateReward(
    poolId: bigint,
    lendId: bigint,
    user: string
  ): Promise<bigint> {
    await this._checkLoanId(poolId, lendId, user)

    if (!ethers.isAddress(user)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.calculateReward.staticCall(poolId, lendId, user)
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

  async lend(
    poolId: bigint,
    usdcAmount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    const pool = await this.getPool(poolId)

    if (pool.endTime <= getUnixEpochTime()) {
      throw new Error(ecpErrorMessage.poolIsClosed)
    }

    if (usdcAmount <= 0) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    if (usdcAmount < pool.collateralDetails.minLended) {
      throw new Error(ecpErrorMessage.amountTooLow)
    }

    if (
      pool.amounts.lended +
        usdcAmount +
        pool.amounts.repaid -
        pool.amounts.borrowed >
      pool.collateralDetails.maxPoolCapacity
    ) {
      throw new Error(ecpErrorMessage.maxPoolCapacityIsReached)
    }

    const pop = await this.contract.lend.populateTransaction(poolId, usdcAmount)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async borrow(
    poolId: bigint,
    usdcAmount: bigint,
    collateralTokenAmount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    const pool = await this.getPool(poolId)

    if (usdcAmount <= 0) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    if (usdcAmount < pool.collateralDetails.minBorrow) {
      throw new Error(ecpErrorMessage.amountTooLow)
    }

    if (pool.endTime <= getUnixEpochTime()) {
      throw new Error(ecpErrorMessage.endTimeReached)
    }

    const pop = await this.contract.borrow.populateTransaction(
      poolId,
      usdcAmount,
      collateralTokenAmount
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async repay(
    poolId: bigint,
    borrowId: bigint,
    repayAmount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()
    await this._checkPoolId(poolId)

    if (this.signer) {
      await this._checkBorrowId(poolId, borrowId, this.signer.address)
    }

    const pop = await this.contract.repay.populateTransaction(
      poolId,
      borrowId,
      repayAmount
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async claim(
    poolId: bigint,
    claims: Array<Claim>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()
    await this._checkPoolId(poolId)

    const totalLoans = this.signer
      ? await this.getTotalLoansByUser(poolId, this.signer.address)
      : BigInt(0)

    for (const claim of claims) {
      if (claim.usdcAmount <= 0 || claim.lendId < 0) {
        throw new Error(ecpErrorMessage.nonNegativeOrZero)
      }

      if (this.signer && totalLoans <= claim.lendId) {
        throw new Error(ecpErrorMessage.noExistLendingId(claim.lendId))
      }
    }

    const pop = await this.contract.claim.populateTransaction(poolId, claims)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async liquidate(
    poolId: bigint,
    liquidations: Array<Liquidation>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()
    await this._checkPoolId(poolId)

    const totalBorrowsByUser = {} as Record<string, bigint>

    for (const liquidation of liquidations) {
      if (liquidation.usdcAmount <= 0 || liquidation.borrowId < 0) {
        throw new Error(ecpErrorMessage.nonNegativeOrZero)
      }

      if (!ethers.isAddress(liquidation.user)) {
        throw new Error(commonErrorMessage.wrongAddressFormat)
      }

      const totalBorrows =
        totalBorrowsByUser[liquidation.user] ||
        (await this.getTotalBorrowsByUser(poolId, liquidation.user))

      if (totalBorrows <= liquidation.borrowId) {
        throw new Error(ecpErrorMessage.noExistBorrowId(liquidation.borrowId))
      }

      totalBorrowsByUser[liquidation.user] = totalBorrows
    }

    const pop = await this.contract.liquidate.populateTransaction(
      poolId,
      liquidations
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
