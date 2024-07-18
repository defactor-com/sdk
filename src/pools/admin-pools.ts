import { ethers } from 'ethers'

import { miscAdminPools } from '../artifacts'
import { counterPartyPoolErrorMessage as cppErrorMessage } from '../errors'
import {
  AdminContractPool,
  AdminPool,
  PoolInput,
  PoolStatusOption
} from '../types/pools'
import { Abi, PrivateKey } from '../types/types'
import { getUnixEpochTime } from '../utilities/util'
import { Pools } from './pools'

export class AdminPools extends Pools {
  readonly POOL_FEE = BigInt(0)

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscAdminPools.abi)
  }

  protected _formatPool(pool: AdminContractPool): AdminPool {
    return { ...super._formatPool(pool), partialClaimed: pool.partialClaimed }
  }

  async createPool(
    pool: PoolInput
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsAdmin()

    return await super.createPool(pool)
  }

  async collectPool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()
    await this._checkIsAdmin()

    const pool = await this.getPool(poolId)

    if (pool.poolStatus !== PoolStatusOption.CREATED) {
      throw new Error(
        cppErrorMessage.poolStatusMustBe(
          poolId,
          pool.poolStatus.toUpperCase(),
          [PoolStatusOption.CREATED]
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
    await this._checkIsAdmin()

    return await super.depositRewards(poolId, amount)
  }

  async closePool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()
    await this._checkIsAdmin()

    const pool = await this.getPool(poolId)

    if (pool.poolStatus !== PoolStatusOption.ACTIVE) {
      throw new Error(
        cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
          PoolStatusOption.ACTIVE
        ])
      )
    }

    const interestRate =
      (pool.totalCommitted * pool.minimumAPR) / this.INTEREST_DECIMAL_PLACES
    const committedAmount = pool.totalCommitted + interestRate

    if (pool.totalRewards < committedAmount) {
      throw new Error(cppErrorMessage.mustDepositAtLeastCommittedAmount)
    }

    const pop = await this.contract.closePool.populateTransaction(poolId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async archivePool(
    poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()
    await this._checkIsAdmin()

    const pool = await this.getPool(poolId)

    if (pool.poolStatus !== PoolStatusOption.CLOSED) {
      throw new Error(
        cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
          PoolStatusOption.CLOSED
        ])
      )
    }

    const currentTimestamp = getUnixEpochTime()

    if (pool.closedTime + this.MIN_POOL_CLOSED_SECS > currentTimestamp) {
      throw new Error(
        cppErrorMessage.cannotArchiveBeforeClosedTime(this.MIN_POOL_CLOSED_DAYS)
      )
    }

    if (pool.totalRewards - pool.rewardsPaidOut > 0) {
      throw new Error(cppErrorMessage.rewardsHaveNotYetBeenPaidOut)
    }

    const pop = await this.contract.archivePool.populateTransaction(poolId)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async uncommitFromPool(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _poolId: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    throw new Error('Method not supported.')
  }
}
