import { ethers } from 'ethers'

import { miscErc20CollateralPool } from './artifacts'
import { BaseContract, Erc20CollateralTokenPoolDetail } from './base-contract'
import { Role } from './provider-utilities'
import { Functions, Pool, PoolInput } from './types/erc20-collateral-token'
import { PoolCommit } from './types/pools'
import { Abi, PrivateKey } from './types/types'

export class ERC20CollateralPool extends BaseContract implements Functions {
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscErc20CollateralPool.abi)
  }

  async LIQUIDATION_PROTOCOL_FEE(): Promise<bigint> {
    const liquidationProtocolFee =
      await this.contract.LIQUIDATION_PROTOCOL_FEE()

    return BigInt(liquidationProtocolFee)
  }

  private async _getPoolById(poolId: bigint): Promise<Pool | null> {
    const totalPools = await this.getTotalPools()

    return poolId < totalPools ? await this.contract.pools(poolId) : null
  }

  async getTotalPools(): Promise<bigint> {
    return await this.contract.poolsLength()
  }

  async getPool(poolId: bigint): Promise<Pool> {
    const pool = await this._getPoolById(poolId)

    if (!pool) {
      throw new Error(`Pool id ${poolId.toString()} does not exist`)
    }

    return pool
  }

  async getPools(offset: bigint, limit: bigint): Promise<Array<Pool>> {
    const totalPools = await this.getTotalPools()

    if (totalPools <= offset) {
      return new Array<Pool>()
    }

    const poolPromises = new Array<Promise<Pool>>()

    for (let i = offset; i < offset + limit && i + offset < totalPools; i++) {
      poolPromises.push(this.getPool(i))
    }

    return await Promise.all(poolPromises)
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
    if (!ethers.isAddress(pool.collateralDetails.collateralToken)) {
      throw new Error(
        'Collateral token does not follow the ethereum address format'
      )
    }

    if (!ethers.isAddress(pool.collateralDetails.collateralTokenChainlink)) {
      throw new Error(
        'Collateral token chainlink does not follow the ethereum address format'
      )
    }

    if (this.signer) {
      const isAdmin = await this.contract.hasRole(Role.ADMIN, this.signer)

      if (!isAdmin) {
        throw new Error('Sender address is not admin')
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

  addPool(pool: PoolInput): Promise<void> {
    throw new Error(
      `Method not implemented. ${pool.collateralDetails.collateralToken}`
    )
  }

  lend(poolId: bigint, amount: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}, ${amount}`)
  }

  borrow(poolId: bigint, amount: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}, ${amount}`)
  }

  repay(poolId: bigint, amount: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}, ${amount}`)
  }

  claimRewards(poolId: bigint, lendingId: bigint): Promise<void> {
    throw new Error(
      `Method not implemented. ${poolId.toString()}, ${lendingId.toString()}`
    )
  }

  claimMultiple(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  claimUnliquidatedCollateral(poolId: bigint, borrowId: bigint): Promise<void> {
    throw new Error(
      `Method not implemented. ${poolId.toString()} ${borrowId.toString()}`
    )
  }

  liquidatePool(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }
}
