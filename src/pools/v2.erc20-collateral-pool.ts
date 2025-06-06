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
  private readonly PRECISION = BigInt(1e18)

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscErc20CollateralPoolV2.abi)
  }

  private async _getList<T>(
    offset: bigint,
    limit: bigint,
    total: bigint,
    getFunction: (id: bigint) => Promise<T>
  ) {
    if (offset < BigInt(0)) {
      throw new Error(ecpErrorMessage.noNegativeOffset)
    }

    if (limit <= BigInt(0)) {
      throw new Error(ecpErrorMessage.noNegativeLimitOrZero)
    }

    const totalResults = Math.min(
      Number(limit),
      Math.max(Number(total - offset), 0)
    )

    // TODO: consider taking this parameter (1000) from a configuration file or some configurable approach
    if (totalResults > 1000) {
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
    if (poolId < BigInt(0)) {
      throw new Error(commonErrorMessage.nonNegativeValue)
    }

    const totalPools = await this.getTotalPools()

    if (poolId >= totalPools) {
      throw new Error(poolCommonErrorMessage.noExistPoolId(poolId))
    }
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
    await this._checkPoolId(poolId)

    return await this.contract.announcedPoolEdit(poolId)
  }

  async getCollateralTokens(): Promise<Array<string>> {
    return await this.contract.getCollateralTokens()
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
    await this._checkPoolId(poolId)

    if (loanId < BigInt(0)) {
      throw new Error(commonErrorMessage.nonNegativeValue)
    }

    const total = await this.getTotalLoansByUser(poolId, address)

    if (loanId >= total) {
      throw new Error(ecpErrorMessage.noExistLendingId(loanId))
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
    await this._checkPoolId(poolId)

    if (borrowId < BigInt(0)) {
      throw new Error(commonErrorMessage.nonNegativeValue)
    }

    const total = await this.getTotalBorrowsByUser(poolId, address)

    if (borrowId >= total) {
      throw new Error(ecpErrorMessage.noExistBorrowId(borrowId))
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

    if (pool.minBorrow <= BigInt(0) || pool.minLended <= BigInt(0)) {
      throw new Error(ecpErrorMessage.amountTooLow)
    }

    if (pool.collateralTokenLTVPercentage > this.MAX_LTV_PERCENTAGE) {
      throw new Error(ecpErrorMessage.collateralTokenLTVTooHigh)
    }

    if (pool.collateralTokenLTVPercentage <= BigInt(0)) {
      throw new Error(ecpErrorMessage.nonNegativeOrZeroCollateralTokenLTV)
    }

    if (
      pool.endTime < BigInt(0) ||
      pool.collateralTokenFactor < BigInt(0) ||
      pool.interest < BigInt(0) ||
      pool.maxPoolCapacity < BigInt(0)
    ) {
      throw new Error(commonErrorMessage.nonNegativeValue)
    }
  }

  private async _checkClaims(
    poolId: bigint,
    claims: Array<Claim>,
    isClaimingCollateral: boolean
  ) {
    if (!claims.length) {
      throw new Error(ecpErrorMessage.noClaimsProvided)
    }

    let totalUsdcClaimedWithRewards = BigInt(0)

    for (const claim of claims) {
      if (claim.usdcAmount <= BigInt(0) || claim.lendId < BigInt(0)) {
        throw new Error(ecpErrorMessage.nonNegativeOrZero)
      }

      if (!this.signer?.address) continue

      const loan = await this.getLoan(poolId, this.signer.address, claim.lendId)

      if (claim.usdcAmount > loan.usdcAmount) {
        throw new Error(ecpErrorMessage.amountTooBig)
      }

      const usdcInterestRewards = await this.calculateReward(
        poolId,
        claim.lendId,
        this.signer.address
      )

      totalUsdcClaimedWithRewards += claim.usdcAmount + usdcInterestRewards
    }

    if (!this.signer?.address) return

    const availableAmount = await this.getAvailableAmountsInPool(poolId)

    if (
      !isClaimingCollateral &&
      availableAmount.availableUSDC < totalUsdcClaimedWithRewards
    ) {
      throw new Error(ecpErrorMessage.notEnoughUSDCInPool)
    }
  }

  private async _checkLiquidations(
    poolId: bigint,
    liquidations: Array<Liquidation>
  ) {
    if (!liquidations.length) {
      throw new Error(ecpErrorMessage.noLiquidationsProvided)
    }

    for (const liquidation of liquidations) {
      if (
        liquidation.usdcAmount <= BigInt(0) ||
        liquidation.borrowId < BigInt(0)
      ) {
        throw new Error(ecpErrorMessage.nonNegativeOrZero)
      }

      if (!ethers.isAddress(liquidation.user)) {
        throw new Error(commonErrorMessage.wrongAddressFormat)
      }

      const borrow = await this.getBorrow(
        poolId,
        liquidation.user,
        liquidation.borrowId
      )

      if (liquidation.usdcAmount > borrow.usdcAmount) {
        throw new Error(ecpErrorMessage.amountTooBig)
      }
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
    if (usdcAmount <= BigInt(0)) {
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

    const collateralTokens = await this.getCollateralTokens()

    if (!collateralTokens.includes(collateralToken)) {
      return BigInt(0)
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
    if (!ethers.isAddress(user)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    const borrow = await this.getBorrow(poolId, user, borrowId)

    if (borrow.usdcAmount <= 0) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
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

  async calculateRequiredUsdcToLiquidate(
    poolId: bigint,
    liquidations: Array<Liquidation>
  ): Promise<bigint> {
    await this._checkLiquidations(poolId, liquidations)

    const pool = await this.getPool(poolId)
    const currentTimestamp = getUnixEpochTime()
    let requiredUsdcAmount = BigInt(0)

    for (const liquidation of liquidations) {
      const borrow = await this.getBorrow(
        poolId,
        liquidation.user,
        liquidation.borrowId
      )
      const repayInterest = this.calculateRepayInterestAt(
        pool.interest,
        borrow,
        liquidation.usdcAmount,
        currentTimestamp
      )
      const usdcAmountWithInterest = liquidation.usdcAmount + repayInterest
      const usdcAmountWithInterestAndProtocolFee =
        (usdcAmountWithInterest *
          (this.LIQUIDATION_PROTOCOL_FEE + this.BPS_DIVIDER)) /
        this.BPS_DIVIDER

      requiredUsdcAmount += usdcAmountWithInterestAndProtocolFee
    }

    return requiredUsdcAmount
  }

  calculateRepayInterestAt(
    poolInterest: bigint,
    borrow: Borrow,
    usdcAmount: bigint,
    timestamp: bigint
  ): bigint {
    const borrowDuration =
      timestamp > borrow.borrowTime ? timestamp - borrow.borrowTime : BigInt(0)
    const numerator = poolInterest * usdcAmount * borrowDuration
    const denominator = this.ONE_YEAR * this.BPS_DIVIDER
    const repayInterest = numerator / denominator

    if (numerator % denominator != BigInt(0)) {
      return repayInterest + BigInt(1)
    }

    return repayInterest
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

    if (announcement.unlocksAt > BigInt(0)) {
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

    if (announcement.unlocksAt <= BigInt(0)) {
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
      announcement.unlocksAt <= BigInt(0) ||
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
    await this._checkIsAdmin()

    if (
      !ethers.isAddress(token) ||
      !ethers.isAddress(recipient) ||
      recipient === ethers.ZeroAddress
    ) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    const collaterals = await this.getCollateralTokens()
    const usdc = await this.getUsdc()

    if (!collaterals.includes(token) && token !== usdc) {
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

    if (usdcAmount <= BigInt(0)) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    const pool = await this.getPool(poolId)

    if (pool.endTime <= getUnixEpochTime()) {
      throw new Error(ecpErrorMessage.poolIsClosed)
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

    if (usdcAmount <= BigInt(0) || collateralTokenAmount < BigInt(0)) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    const pool = await this.getPool(poolId)

    if (usdcAmount < pool.collateralDetails.minBorrow) {
      throw new Error(ecpErrorMessage.amountTooLow)
    }

    if (pool.endTime <= getUnixEpochTime()) {
      throw new Error(ecpErrorMessage.endTimeReached)
    }

    const availableAmount = await this.getAvailableAmountsInPool(poolId)

    if (availableAmount.availableUSDC < usdcAmount) {
      throw new Error(ecpErrorMessage.notEnoughUSDCInPool)
    }

    const minCollateralTokenAmount = await this.calculateCollateralTokenAmount(
      poolId,
      usdcAmount
    )

    if (collateralTokenAmount < minCollateralTokenAmount) {
      throw new Error(ecpErrorMessage.collateralAmountTooLow)
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

    if (repayAmount <= 0) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    if (this.signer) {
      const borrow = await this.getBorrow(poolId, this.signer.address, borrowId)

      if (repayAmount > borrow.usdcAmount) {
        throw new Error(ecpErrorMessage.amountTooBig)
      }
    } else {
      await this._checkPoolId(poolId)
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
    await this._checkClaims(poolId, claims, false)

    const pop = await this.contract.claim.populateTransaction(poolId, claims)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async liquidate(
    poolId: bigint,
    liquidations: Array<Liquidation>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    const unPausedTimestamp = await this.getUnpausedTime()

    if (unPausedTimestamp + this.DAY_SEC > getUnixEpochTime()) {
      throw new Error(ecpErrorMessage.pauseGracePeriodNotPassed)
    }

    await this._checkLiquidations(poolId, liquidations)

    const pop = await this.contract.liquidate.populateTransaction(
      poolId,
      liquidations
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async changeCollateralAmount(
    poolId: bigint,
    borrowId: bigint,
    newCollateralTokenAmount: bigint,
    maxCollateralTokenLTVPercentage: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    if (this.signer) {
      const borrow = await this.getBorrow(poolId, this.signer.address, borrowId)

      if (borrow.collateralTokenAmount <= BigInt(0)) {
        throw new Error(ecpErrorMessage.borrowAlreadyLiquidated)
      }

      if (newCollateralTokenAmount === borrow.collateralTokenAmount) {
        throw new Error(ecpErrorMessage.collateralAmountNotChanged)
      }

      const minCollateralTokenAmount =
        await this.calculateCollateralTokenAmount(poolId, borrow.usdcAmount)

      if (newCollateralTokenAmount < minCollateralTokenAmount) {
        throw new Error(ecpErrorMessage.collateralAmountTooLow)
      }
    } else {
      await this._checkPoolId(poolId)
    }

    const pop = await this.contract.changeCollateralAmount.populateTransaction(
      poolId,
      borrowId,
      newCollateralTokenAmount,
      maxCollateralTokenLTVPercentage
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async claimCollateral(
    poolId: bigint,
    claims: Array<Claim>,
    liquidations: Array<Liquidation>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()
    await this._checkClaims(poolId, claims, true)
    await this._checkLiquidations(poolId, liquidations)

    const pop = await this.contract.claimCollateral.populateTransaction(
      poolId,
      claims,
      liquidations
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
