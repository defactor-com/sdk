import { ethers } from 'ethers'

import { miscErc20CollateralPool } from '../artifacts'
import { BaseContract } from '../base-classes'
import {
  commonErrorMessage,
  erc20CollateralPoolErrorMessage as ecpErrorMessage,
  poolCommonErrorMessage
} from '../errors'
import {
  Borrow,
  Erc20CollateralTokenPoolDetail,
  Functions,
  Lend,
  Pool,
  PoolInput,
  PoolLiquidationInfo,
  ERC20CollateralPoolViews as Views
} from '../types/erc20-collateral-token'
import { AdminFunctions } from '../types/pools'
import { Abi, Pagination, PrivateKey } from '../types/types'
import { NULL_ADDRESS, Role } from '../utilities/util'

export class ERC20CollateralPool
  extends BaseContract
  implements Functions, Views, AdminFunctions
{
  readonly LIQUIDATION_PROTOCOL_FEE = BigInt(5)
  readonly LIQUIDATION_FEE = BigInt(5)
  readonly OZ_IN_G = BigInt(31_10347680)
  readonly ONE_YEAR = BigInt(365)
  readonly HOUNDRED = BigInt(100)

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscErc20CollateralPool.abi)
  }

  async USDC_FEES_COLLECTED(): Promise<bigint> {
    return await this.contract.usdcFeesCollected()
  }

  async getUsdc(): Promise<string> {
    return await this.contract.USDC()
  }

  protected existPool(pool: Pool): boolean {
    // logic taken from the smart contract validation
    return pool.collateralDetails.collateralToken !== NULL_ADDRESS
  }

  protected async _existBorrow(
    poolId: bigint,
    borrowId: bigint,
    borrowerAddress: string
  ): Promise<boolean> {
    const totalBorrows = await this.getTotalBorrows(poolId, borrowerAddress)

    return borrowId < totalBorrows
  }

  protected async _getPoolById(poolId: bigint): Promise<Pool | null> {
    const pool = await this.contract.pools(poolId)

    if (!this.existPool(pool)) {
      return null
    }

    return pool
  }

  protected async _getBorrow(
    poolId: bigint,
    borrowerAddress: string,
    borrowId: bigint
  ): Promise<Borrow> {
    return await this.contract.borrows(poolId, borrowerAddress, borrowId)
  }

  protected _isPoolCompleted(pool: Pool) {
    return (
      pool.liquidatedCollateral > BigInt(0) ||
      pool.collateralTokenAmount == BigInt(0) ||
      pool.liquidated
    )
  }

  async getTotalPools(): Promise<bigint> {
    return await this.contract.poolsLength()
  }

  protected async _getTotalLending(
    poolId: bigint,
    address: string
  ): Promise<bigint> {
    return await this.contract.lendingsLength(poolId, address)
  }

  protected async _getLoan(
    poolId: bigint,
    address: string,
    lendingId: bigint
  ): Promise<Lend> {
    return await this.contract.lendings(poolId, address, lendingId)
  }

  async getTotalBorrows(
    poolId: bigint,
    borrowerAddress: string
  ): Promise<bigint> {
    await this.getPool(poolId)

    if (!ethers.isAddress(borrowerAddress)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.borrowsLength(poolId, borrowerAddress)
  }

  async getPool(poolId: bigint): Promise<Pool> {
    const pool = await this._getPoolById(poolId)

    if (!pool) {
      throw new Error(poolCommonErrorMessage.noExistPoolId(poolId))
    }

    return pool
  }

  async getPools(offset: bigint, limit: bigint): Promise<Pagination<Pool>> {
    if (offset < 0) {
      throw new Error(ecpErrorMessage.noNegativeOffset)
    }

    if (limit <= 0) {
      throw new Error(ecpErrorMessage.noNegativeLimitOrZero)
    }

    // TODO: consider taking this parameter (1000) from a configuration file or some configurable approach
    if (limit > 1000) {
      throw new Error(ecpErrorMessage.maxLimitAllowed)
    }

    const totalPools = await this.getTotalPools()

    if (totalPools <= offset) {
      return { data: new Array<Pool>(), more: false }
    }

    const poolPromises = new Array<Promise<Pool>>()

    for (let i = offset; i < offset + limit && i < totalPools; i++) {
      poolPromises.push(this.getPool(i))
    }

    return {
      data: await Promise.all(poolPromises),
      more: offset + limit < totalPools
    }
  }

  async getTotalLending(poolId: bigint, address: string): Promise<bigint> {
    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    await this.getPool(poolId)

    return await this._getTotalLending(poolId, address)
  }

  async getLoan(
    poolId: bigint,
    address: string,
    lendingId: bigint
  ): Promise<Lend> {
    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    const totalLending = await this._getTotalLending(poolId, address)

    await this.getPool(poolId)

    if (lendingId >= totalLending) {
      throw new Error(ecpErrorMessage.noExistLendingId(lendingId))
    }

    return await this._getLoan(poolId, address, lendingId)
  }

  async listLoansByLender(
    offset: bigint,
    limit: bigint,
    poolId: bigint,
    lenderAddress: string
  ): Promise<Pagination<Lend>> {
    if (offset < 0) {
      throw new Error(ecpErrorMessage.noNegativeOffset)
    }

    if (limit <= 0) {
      throw new Error(ecpErrorMessage.noNegativeLimitOrZero)
    }

    // TODO: consider taking this parameter (1000) from a configuration file or some configurable approach
    if (limit > 1000) {
      throw new Error(ecpErrorMessage.maxLimitAllowed)
    }

    if (!ethers.isAddress(lenderAddress)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    await this.getPool(poolId)

    const loanPromises = new Array<Promise<Lend>>()
    const totalLending = await this._getTotalLending(poolId, lenderAddress)

    for (let i = offset; i < offset + limit && i < totalLending; i++) {
      loanPromises.push(this._getLoan(poolId, lenderAddress, i))
    }

    return {
      data: await Promise.all(loanPromises),
      more: offset + limit < totalLending
    }
  }

  getPoolDetails(
    poolId: bigint,
    walletAddress: string
  ): Promise<Erc20CollateralTokenPoolDetail> {
    throw new Error(
      `Method not implemented. ${poolId.toString()}, ${walletAddress}`
    )
  }

  pause(): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    throw new Error('Method not implemented.')
  }

  unpause(): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    throw new Error('Method not implemented.')
  }

  async addPool(
    pool: PoolInput
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (!ethers.isAddress(pool.collateralDetails.collateralToken)) {
      throw new Error(ecpErrorMessage.wrongAddressFormatCustom())
    }

    if (!ethers.isAddress(pool.collateralDetails.collateralTokenChainlink)) {
      throw new Error(ecpErrorMessage.wrongAddressFormatCustom('chainlink'))
    }

    if (pool.endTime <= Date.now() / 1000) {
      throw new Error(ecpErrorMessage.timeMustBeInFuture)
    }

    if (this.signer) {
      const isAdmin = await this.contract.hasRole(Role.ADMIN, this.signer)

      if (!isAdmin) {
        throw new Error(commonErrorMessage.addressIsNotAdmin)
      }
    }

    const formattedPool = {
      endTime: pool.endTime,
      interest: pool.interest,
      collateralToken: pool.collateralDetails.collateralToken,
      collateralTokenChainlink: pool.collateralDetails.collateralTokenChainlink,
      collateralTokenFactor: pool.collateralDetails.collateralTokenFactor,
      collateralTokenPercentage:
        pool.collateralDetails.collateralTokenPercentage
    }

    const pop = await this.contract.addPool.populateTransaction(formattedPool)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async lend(
    poolId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    const pool = await this.getPool(poolId)

    if (pool.endTime <= Date.now() / 1000) {
      throw new Error(ecpErrorMessage.poolIsClosed)
    }

    if (amount <= 0) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    const pop = await this.contract.lend.populateTransaction(poolId, amount)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async borrow(
    poolId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    const pool = await this.getPool(poolId)

    if (amount <= 0) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    if (pool.endTime <= Date.now() / 1000) {
      throw new Error(ecpErrorMessage.endTimeReached)
    }

    if (pool.lended + pool.repaid + pool.rewards - pool.borrowed < amount) {
      throw new Error(ecpErrorMessage.amountOverpassPoolBalance)
    }

    const pop = await this.contract.borrow.populateTransaction(poolId, amount)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async getBorrow(
    poolId: bigint,
    borrowerAddress: string,
    borrowId: bigint
  ): Promise<Borrow> {
    const existBorrow = await this._existBorrow(
      poolId,
      borrowId,
      borrowerAddress
    )

    if (!existBorrow) {
      throw new Error(ecpErrorMessage.noExistBorrowId(borrowId))
    }

    return await this.contract.borrows(poolId, borrowerAddress, borrowId)
  }

  async calculateCollateralTokenAmount(
    poolId: bigint,
    amount: bigint
  ): Promise<bigint> {
    await this.getPool(poolId)

    if (amount <= 0) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    return await this.contract.calculateCollateralTokenAmount(poolId, amount)
  }

  async getBorrowsByBorrower(
    poolId: bigint,
    borrowerAddress: string,
    offset: bigint,
    limit: bigint
  ): Promise<Pagination<Borrow>> {
    if (offset < 0) {
      throw new Error(ecpErrorMessage.noNegativeOffset)
    }

    if (limit <= 0) {
      throw new Error(ecpErrorMessage.noNegativeLimitOrZero)
    }

    // TODO: consider taking this parameter (1000) from a configuration file or some configurable approach
    if (limit > 1000) {
      throw new Error(ecpErrorMessage.maxLimitAllowed)
    }

    if (!ethers.isAddress(borrowerAddress)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    await this.getPool(poolId)

    const borrowPromises = new Array<Promise<Borrow>>()
    const totalBorrows = await this.getTotalBorrows(poolId, borrowerAddress)

    for (let i = offset; i < offset + limit && i < totalBorrows; i++) {
      borrowPromises.push(this._getBorrow(poolId, borrowerAddress, i))
    }

    return {
      data: await Promise.all(borrowPromises),
      more: offset + limit < totalBorrows
    }
  }

  async calculateRepayInterest(
    poolId: bigint,
    borrowerAddress: string,
    borrowId: bigint
  ): Promise<bigint> {
    await this.getPool(poolId)

    if (!ethers.isAddress(borrowerAddress)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    const existBorrow = await this._existBorrow(
      poolId,
      borrowId,
      borrowerAddress
    )

    if (!existBorrow) {
      throw new Error(ecpErrorMessage.noExistBorrowId(borrowId))
    }

    return await this.contract.calculateRepayInterest(
      poolId,
      borrowId,
      borrowerAddress
    )
  }

  async repay(
    poolId: bigint,
    borrowerAddress: string,
    borrowId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this.getPool(poolId)

    if (!ethers.isAddress(borrowerAddress)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    const borrow = await this.getBorrow(poolId, borrowerAddress, borrowId)

    if (borrow.repayTime > 0) {
      throw new Error(ecpErrorMessage.borrowAlreadyRepaid)
    }

    const pop = await this.contract.repay.populateTransaction(poolId, borrowId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async claimRewards(
    poolId: bigint,
    address: string,
    lendingId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    const pool = await this.getPool(poolId)

    if (pool.endTime > Date.now() / 1000) {
      throw new Error(ecpErrorMessage.poolIsNotClosed)
    }

    if (!this._isPoolCompleted(pool)) {
      throw new Error(ecpErrorMessage.poolIsNotCompleted)
    }

    const loan = await this.getLoan(poolId, address, lendingId)

    if (loan.claimed) {
      throw new Error(ecpErrorMessage.loanAlreadyClaimed)
    }

    const pop = await this.contract.claimRewards.populateTransaction(
      poolId,
      lendingId
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  claimMultiple(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  claimUnliquidatedCollateral(poolId: bigint, borrowId: bigint): Promise<void> {
    throw new Error(
      `Method not implemented. ${poolId.toString()} ${borrowId.toString()}`
    )
  }

  async getLiquidationInfo(pool: Pool): Promise<PoolLiquidationInfo> {
    if (pool.endTime > Date.now()) {
      throw new Error(ecpErrorMessage.poolIsNotClosed)
    }

    if (
      pool.liquidatedCollateral > BigInt(0) ||
      pool.collateralTokenAmount == BigInt(0) ||
      pool.liquidated
    ) {
      throw new Error(ecpErrorMessage.poolCannotBeLiquidated)
    }

    const remainingInterest = pool.lended * pool.rewardPerToken - pool.rewards
    const liquidatableAmount = pool.borrowed - pool.repaid + remainingInterest

    const liquidatableAmountWithProtocolFee =
      (liquidatableAmount * (this.LIQUIDATION_PROTOCOL_FEE + this.HOUNDRED)) /
      this.HOUNDRED

    const liquidatableAmountWithLiquidationFee =
      (liquidatableAmount *
        (this.LIQUIDATION_FEE +
          this.LIQUIDATION_PROTOCOL_FEE +
          this.HOUNDRED)) /
      this.HOUNDRED

    return {
      remainingInterest,
      liquidatableAmountWithProtocolFee,
      liquidatableAmountWithLiquidationFee
    }
  }

  async liquidatePool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    const pool = await this.getPool(poolId)

    if (pool.endTime > Date.now()) {
      throw new Error(ecpErrorMessage.poolIsNotClosed)
    }

    if (this._isPoolCompleted(pool)) {
      throw new Error(ecpErrorMessage.poolCannotBeLiquidated)
    }

    const pop = await this.contract.liquidatePool.populateTransaction(poolId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
