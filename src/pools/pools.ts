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
  private readonly ONE_DAY_SEC = 86400
  private readonly ONE_YEAR_SEC = this.ONE_DAY_SEC * 365
  readonly POOL_FEE = BigInt(200_000000)
  readonly COLLECT_POOL_MAX_DAYS = BigInt(30)
  readonly COLLECT_POOL_MAX_SECS = BigInt(
    this.COLLECT_POOL_MAX_DAYS * BigInt(this.ONE_DAY_SEC)
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

  private _checkIsNotPaused = async () => {
    const isPaused = await this.isPaused()

    if (isPaused) {
      throw new Error(poolCommonErrorMessage.contractIsPaused)
    }
  }

  private _checkIsAdmin = async () => {
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

  private async _getPoolById(poolId: bigint): Promise<Pool | null> {
    const poolIndex = await this.contract.poolIndex()

    if (poolId < 0 || poolId >= poolIndex) return null

    const pool: ContractPool = await this.contract.getPool(poolId)

    const formattedPool: Pool = {
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

    return pool.createdAt !== BigInt(0) ? formattedPool : null
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

    if (pool.softCap <= BigInt(0)) {
      throw new Error(cppErrorMessage.noNegativeSoftCapOrZero)
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
        cppErrorMessage.poolIsNotCreated(poolId, pool.poolStatus.toUpperCase())
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

  depositRewards(poolId: bigint, amount: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId}, ${amount}`)
  }

  closePool(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  archivePool(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
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
      throw new Error(cppErrorMessage.poolOwnerCannotCommitToHisOwnPool)
    }

    if (pool.poolStatus !== PoolStatusOption.CREATED) {
      throw new Error(
        cppErrorMessage.poolIsNotCreated(poolId, pool.poolStatus.toUpperCase())
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

  uncommitFromPool(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  claim(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }
}
