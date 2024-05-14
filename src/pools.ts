import { ethers } from 'ethers'

import { miscPools } from './artifacts'
import {
  AdminFunctions,
  BaseContract,
  Erc20CollateralTokenPoolDetail,
  Pagination,
  Views
} from './base-contract'
import { cppErrorMessage, poolCommonErrorMessage } from './error-messages'
import {
  ContractPool,
  Functions,
  Pool,
  PoolCommit,
  PoolInput,
  PoolStatus,
  PoolStatusOption
} from './types/pools'
import { Abi, PrivateKey } from './types/types'
import { getUnixEpochTime } from './util'

export class Pools
  extends BaseContract
  implements Functions, Views, AdminFunctions
{
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

  private async _getPoolById(poolId: bigint): Promise<Pool | null> {
    if (poolId < 0) return null

    const pool: ContractPool = await this.contract.pools(poolId)
    const statuses = Object.keys(PoolStatusOption)
    const status = Number(pool.poolStatus)

    if (status < 0 || status >= statuses.length) {
      throw new Error(
        poolCommonErrorMessage.noSupportedPoolStatus(poolId, pool.poolStatus)
      )
    }

    const formattedPool: Pool = {
      softCap: pool.softCap,
      hardCap: pool.hardCap,
      totalCommitted: pool.totalCommitted,
      totalRewards: pool.totalRewards,
      rewardsPaidOut: pool.rewardsPaidOut,
      createdAt: pool.createdAt,
      deadline: pool.deadline,
      closedTime: pool.closedTime,
      poolOwner: pool.poolOwner,
      collateralToken: Array.isArray(pool.collateralToken)
        ? pool.collateralToken
        : [],
      poolStatus: statuses[status] as PoolStatus
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

  pause(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  unpause(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async createPool(
    pool: PoolInput
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (pool.softCap <= BigInt(0)) {
      throw new Error(cppErrorMessage.noNegativeSoftCapOrZero)
    }

    if (pool.hardCap < pool.softCap) {
      throw new Error(cppErrorMessage.softCapMustBeLessThanHardCap)
    }

    if (pool.deadline <= getUnixEpochTime()) {
      throw new Error(cppErrorMessage.deadlineMustBeInFuture)
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
      formattedPool.collateralTokens
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  collectPool(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
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
    const pool = await this.getPool(poolId)

    if (amount <= BigInt(0)) {
      throw new Error(poolCommonErrorMessage.noNegativeAmountOrZero)
    }

    if (pool.poolStatus !== PoolStatusOption.CREATED) {
      throw new Error(
        cppErrorMessage.poolIsNotCreated(pool.poolStatus.toLowerCase())
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
