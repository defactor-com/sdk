import { ethers } from 'ethers'

import { miscPools } from '../artifacts'
import { BaseContract } from '../base-classes'
import {
  counterPartyPoolErrorMessage as cppErrorMessage,
  poolCommonErrorMessage
} from '../errors'
import { Erc20CollateralTokenPoolDetail } from '../types/erc20-collateral-token'
import {
  AdminFunctions,
  ContractPool,
  Functions,
  Pool,
  PoolCommit,
  PoolInput,
  PoolStatus,
  PoolStatusOption,
  PoolViews as Views
} from '../types/pools'
import { Abi, Pagination, PrivateKey } from '../types/types'
import { Role, getUnixEpochTime } from '../utilities/util'

export class Pools
  extends BaseContract
  implements Functions, Views, AdminFunctions
{
  readonly ONE_DAY_SEC = 86400
  readonly ONE_YEAR_SEC = this.ONE_DAY_SEC * 365
  readonly INTEREST_DECIMAL_PLACES = BigInt(100_000_000)
  readonly POOL_FEE = BigInt(200_000000)
  readonly COLLECT_POOL_MAX_DAYS = BigInt(30)
  readonly COLLECT_POOL_MAX_SECS = BigInt(
    this.COLLECT_POOL_MAX_DAYS * BigInt(this.ONE_DAY_SEC)
  )
  readonly MIN_POOL_CLOSED_DAYS = BigInt(60)
  readonly MIN_POOL_CLOSED_SECS = BigInt(
    this.MIN_POOL_CLOSED_DAYS * BigInt(this.ONE_DAY_SEC)
  )

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscPools.abi)
  }

  async USD_ADDRESS(): Promise<string> {
    return await this.contract.USDC()
  }

  async isPaused(): Promise<boolean> {
    return await this.contract.paused()
  }

  protected _checkIsNotPaused = async () => {
    const isPaused = await this.isPaused()

    if (isPaused) {
      throw new Error(poolCommonErrorMessage.contractIsPaused)
    }
  }

  protected _checkIsAdmin = async () => {
    if (this.signer) {
      const isAdmin = await this.contract.hasRole(Role.ADMIN, this.signer)

      if (!isAdmin) {
        throw new Error(poolCommonErrorMessage.addressIsNotAdmin)
      }
    }
  }

  private _getStatusByIndex = (index: bigint) => {
    const statusOptions = Object.keys(PoolStatusOption)
    const status = Number(index)

    if (status < 0 || status >= statusOptions.length) {
      throw new Error(poolCommonErrorMessage.noSupportedPoolStatus(index))
    }

    return statusOptions[status] as PoolStatus
  }

  protected _formatPool(pool: ContractPool): Pool {
    return {
      softCap: pool.softCap,
      hardCap: pool.hardCap,
      totalCommitted: pool.totalCommitted,
      totalRewards: pool.totalRewards,
      rewardsPaidOut: pool.rewardsPaidOut,
      createdAt: pool.createdAt,
      deadline: pool.deadline,
      minimumAPR: pool.minimumAPR,
      closedTime: pool.closedTime,
      poolOwner: pool.poolOwner,
      poolStatus: this._getStatusByIndex(pool.poolStatus),
      collateralTokens: Array.isArray(pool.collateralTokens)
        ? pool.collateralTokens.map(collateral => ({
            contractAddress: collateral.contractAddress,
            amount: collateral.amount,
            id: collateral.id
          }))
        : []
    }
  }

  private async _getPoolById(poolId: bigint): Promise<Pool | null> {
    const poolIndex = await this.contract.poolIndex()

    if (poolId < 0 || poolId >= poolIndex) return null

    const pool: ContractPool = await this.contract.getPool(poolId)

    const formattedPool = this._formatPool(pool)

    return pool.createdAt !== BigInt(0) ? formattedPool : null
  }

  private async _getPoolCommit(
    userAddress: string,
    poolId: bigint
  ): Promise<PoolCommit> {
    if (!ethers.isAddress(userAddress)) {
      throw new Error(poolCommonErrorMessage.wrongAddressFormat)
    }

    const poolIndex = await this.contract.poolIndex()

    if (poolId < 0 || poolId >= poolIndex) {
      throw new Error(poolCommonErrorMessage.noExistPoolId(poolId))
    }

    const poolCommits: PoolCommit = await this.contract.poolCommits(
      userAddress,
      poolId
    )

    return {
      amount: poolCommits.amount,
      claimedAmount: poolCommits.claimedAmount
    }
  }

  async getPool(poolId: bigint): Promise<Pool> {
    const pool = await this._getPoolById(poolId)

    if (!pool) {
      throw new Error(poolCommonErrorMessage.noExistPoolId(poolId))
    }

    return pool
  }

  async getPools(offset: bigint, limit: bigint): Promise<Pagination<Pool>> {
    const tempPoolPromises = new Array<Promise<Pool | null>>()

    for (let i = offset; i < offset + limit; i++) {
      tempPoolPromises.push(this._getPoolById(i))
    }

    const pools = await Promise.all(tempPoolPromises)

    return {
      data: pools.filter(pool => pool !== null) as Array<Pool>,
      // TODO: create get total pools function to make `offset + limit < totalPools`
      more: true
    }
  }

  getPoolDetails(
    poolId: bigint,
    walletAddress: string
  ): Promise<Erc20CollateralTokenPoolDetail | PoolCommit> {
    throw new Error(
      `Method not implemented. ${poolId.toString()}, ${walletAddress}`
    )
  }

  async pause(): Promise<
    ethers.ContractTransaction | ethers.TransactionResponse
  > {
    await this._checkIsAdmin()

    const pop = await this.contract.pause.populateTransaction()

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async unpause(): Promise<
    ethers.ContractTransaction | ethers.TransactionResponse
  > {
    await this._checkIsAdmin()

    const pop = await this.contract.unpause.populateTransaction()

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async createPool(
    pool: PoolInput
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    if (pool.softCap < BigInt(0)) {
      throw new Error(cppErrorMessage.noNegativeSoftCap)
    }

    if (pool.minimumAPR < BigInt(0)) {
      throw new Error(cppErrorMessage.noNegativeMinimumAPR)
    }

    if (pool.hardCap < pool.softCap) {
      throw new Error(cppErrorMessage.softCapMustBeLessThanHardCap)
    }

    const currentTimestamp = getUnixEpochTime()

    if (pool.deadline <= currentTimestamp) {
      throw new Error(cppErrorMessage.deadlineMustBeInFuture)
    }

    if (pool.deadline > currentTimestamp + BigInt(this.ONE_YEAR_SEC)) {
      throw new Error(cppErrorMessage.deadlineMustNotBeMoreThan1YearInTheFuture)
    }

    for (const token of pool.collateralTokens) {
      if (!ethers.isAddress(token.contractAddress)) {
        throw new Error(poolCommonErrorMessage.wrongAddressFormat)
      }

      if (token.amount <= BigInt(0)) {
        throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
      }
    }

    const formattedPool = {
      softCap: pool.softCap.toString(),
      hardCap: pool.hardCap.toString(),
      deadline: pool.deadline,
      minimumAPR: pool.minimumAPR,
      collateralTokens: pool.collateralTokens.map(token => [
        token.contractAddress,
        token.amount.toString(),
        token.id ? token.id.toString() : 0
      ])
    }

    const pop = await this.contract.createPool.populateTransaction(
      formattedPool.softCap,
      formattedPool.hardCap,
      formattedPool.deadline,
      formattedPool.minimumAPR,
      formattedPool.collateralTokens
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async collectPool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    const pool = await this.getPool(poolId)

    if (this.signer && this.signer.address !== pool.poolOwner) {
      throw new Error(cppErrorMessage.addressIsNotOwner)
    }

    if (pool.poolStatus !== PoolStatusOption.CREATED) {
      throw new Error(
        cppErrorMessage.poolStatusMustBe(
          poolId,
          pool.poolStatus.toUpperCase(),
          [PoolStatusOption.CREATED]
        )
      )
    }

    if (pool.softCap > pool.totalCommitted) {
      throw new Error(cppErrorMessage.softCapNotReached)
    }

    const currentTimestamp = getUnixEpochTime()

    if (pool.deadline > currentTimestamp) {
      throw new Error(cppErrorMessage.deadlineNotReached)
    }

    if (pool.deadline + this.COLLECT_POOL_MAX_SECS < currentTimestamp) {
      throw new Error(
        cppErrorMessage.cannotCollectDaysAfterDeadline(
          this.COLLECT_POOL_MAX_DAYS
        )
      )
    }

    const pop = await this.contract.collectPool.populateTransaction(poolId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async depositRewards(
    poolId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    const pool = await this.getPool(poolId)

    if (this.signer && this.signer.address !== pool.poolOwner) {
      throw new Error(cppErrorMessage.addressIsNotOwner)
    }

    if (amount <= BigInt(0)) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    if (pool.poolStatus !== PoolStatusOption.ACTIVE) {
      throw new Error(
        cppErrorMessage.poolStatusMustBe(
          poolId,
          pool.poolStatus.toUpperCase(),
          [PoolStatusOption.ACTIVE]
        )
      )
    }

    const pop = await this.contract.depositRewards.populateTransaction(
      poolId,
      amount
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async closePool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    const pool = await this.getPool(poolId)

    if (this.signer && this.signer.address !== pool.poolOwner) {
      throw new Error(cppErrorMessage.addressIsNotOwner)
    }

    if (
      pool.poolStatus !== PoolStatusOption.CREATED &&
      pool.poolStatus !== PoolStatusOption.ACTIVE
    ) {
      throw new Error(
        cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
          PoolStatusOption.ACTIVE,
          PoolStatusOption.CREATED
        ])
      )
    }

    if (pool.poolStatus === PoolStatusOption.CREATED) {
      const currentTimestamp = getUnixEpochTime()

      if (pool.deadline > currentTimestamp) {
        throw new Error(cppErrorMessage.deadlineNotReached)
      }

      const maxCollectTimeHasPassed =
        pool.deadline + this.COLLECT_POOL_MAX_SECS < currentTimestamp

      if (!maxCollectTimeHasPassed && pool.softCap < pool.totalCommitted) {
        throw new Error(cppErrorMessage.softCapReached)
      }
    } else {
      const interestRate =
        (pool.totalCommitted * pool.minimumAPR) / this.INTEREST_DECIMAL_PLACES
      const committedAmount = pool.totalCommitted + interestRate

      if (pool.totalRewards < committedAmount) {
        throw new Error(cppErrorMessage.mustDepositAtLeastCommittedAmount)
      }
    }

    const pop = await this.contract.closePool.populateTransaction(poolId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async archivePool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    const pool = await this.getPool(poolId)

    if (this.signer) {
      const isAdmin = await this.contract.hasRole(Role.ADMIN, this.signer)
      const isOwner = this.signer.address === pool.poolOwner

      if (!isAdmin && !isOwner) {
        throw new Error(cppErrorMessage.mustBeOwnerOrAdmin)
      }
    }

    if (
      pool.poolStatus !== PoolStatusOption.CREATED &&
      pool.poolStatus !== PoolStatusOption.CLOSED
    ) {
      throw new Error(
        cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
          PoolStatusOption.CLOSED,
          PoolStatusOption.CREATED
        ])
      )
    }

    const currentTimestamp = getUnixEpochTime()

    if (pool.poolStatus === PoolStatusOption.CREATED) {
      if (pool.deadline + this.MIN_POOL_CLOSED_SECS > currentTimestamp) {
        throw new Error(
          cppErrorMessage.cannotArchiveBeforeDeadline(this.MIN_POOL_CLOSED_DAYS)
        )
      }

      if (pool.totalCommitted > 0) {
        throw new Error(cppErrorMessage.committedAmountMustBeZero)
      }
    } else {
      if (pool.closedTime + this.MIN_POOL_CLOSED_SECS > currentTimestamp) {
        throw new Error(
          cppErrorMessage.cannotArchiveBeforeClosedTime(
            this.MIN_POOL_CLOSED_DAYS
          )
        )
      }
    }

    if (pool.totalRewards - pool.rewardsPaidOut > 0) {
      throw new Error(cppErrorMessage.rewardsHaveNotYetBeenPaidOut)
    }

    const pop = await this.contract.archivePool.populateTransaction(poolId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async commitToPool(
    poolId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    const pool = await this.getPool(poolId)

    if (amount <= BigInt(0)) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    if (this.signer && this.signer.address === pool.poolOwner) {
      throw new Error(cppErrorMessage.poolOwnerCannotCommitToTheirOwnPool)
    }

    if (pool.poolStatus !== PoolStatusOption.CREATED) {
      throw new Error(
        cppErrorMessage.poolStatusMustBe(
          poolId,
          pool.poolStatus.toUpperCase(),
          [PoolStatusOption.CREATED]
        )
      )
    }

    if (pool.deadline < getUnixEpochTime()) {
      throw new Error(cppErrorMessage.deadlineReached)
    }

    if (pool.hardCap < pool.totalCommitted + amount) {
      throw new Error(cppErrorMessage.amountExceedsHardCap)
    }

    const pop = await this.contract.commitToPool.populateTransaction(
      poolId,
      amount
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async uncommitFromPool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    const pool = await this.getPool(poolId)

    if (pool.poolStatus !== PoolStatusOption.CREATED) {
      throw new Error(
        cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
          PoolStatusOption.CREATED
        ])
      )
    }

    const currentTimestamp = getUnixEpochTime()
    const maxCollectTimeHasPassed =
      pool.deadline + this.COLLECT_POOL_MAX_SECS < currentTimestamp

    if (
      !maxCollectTimeHasPassed &&
      pool.softCap <= pool.totalCommitted &&
      pool.deadline < currentTimestamp
    ) {
      throw new Error(cppErrorMessage.deadlineAndSoftCapReached)
    }

    if (this.signer) {
      if (this.signer.address === pool.poolOwner) {
        throw new Error(cppErrorMessage.poolOwnerCannotUncommitToTheirOwnPool)
      }

      const poolCommit = await this._getPoolCommit(this.signer.address, poolId)

      if (poolCommit.amount <= BigInt(0)) {
        throw new Error(cppErrorMessage.poolHasNoCommittedAmount)
      }
    }

    const pop = await this.contract.uncommitFromPool.populateTransaction(poolId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async claim(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()

    const pool = await this.getPool(poolId)

    if (
      pool.poolStatus !== PoolStatusOption.CLOSED &&
      pool.poolStatus !== PoolStatusOption.ACTIVE
    ) {
      throw new Error(
        cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
          PoolStatusOption.ACTIVE,
          PoolStatusOption.CLOSED
        ])
      )
    }

    if (pool.totalRewards <= BigInt(0)) {
      throw new Error(cppErrorMessage.poolHasNoRewards)
    }

    if (this.signer) {
      if (this.signer.address === pool.poolOwner) {
        throw new Error(cppErrorMessage.poolOwnerCannotClaimToTheirOwnPool)
      }

      const poolCommit = await this._getPoolCommit(this.signer.address, poolId)

      if (poolCommit.amount <= BigInt(0)) {
        throw new Error(cppErrorMessage.mustCommitBeforeClaim)
      }

      const rewards =
        (pool.totalRewards * poolCommit.amount) / pool.totalCommitted

      if (rewards <= poolCommit.claimedAmount) {
        throw new Error(cppErrorMessage.poolAlreadyClaimed)
      }
    }

    const pop = await this.contract.claim.populateTransaction(poolId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
