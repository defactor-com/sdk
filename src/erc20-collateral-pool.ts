import { ethers } from 'ethers'

import { BaseContract, Erc20CollateralTokenPoolDetail } from './base-contract'
import { Role } from './provider-utilities'
import {
  Pool as Erc20CollateralPool,
  Functions,
  Pool
} from './types/erc20-collateral-token'
import { PoolCommit, PoolObject } from './types/pools'
import { Abi, PrivateKey } from './types/types'

export class ERC20CollateralPool extends BaseContract implements Functions {
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi)
  }

  async LIQUIDATION_PROTOCOL_FEE(): Promise<bigint> {
    const liquidationProtocolFee =
      await this.contract.LIQUIDATION_PROTOCOL_FEE()

    return BigInt(liquidationProtocolFee)
  }

  getPool(poolId: bigint): Promise<Erc20CollateralPool | PoolObject> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  getPools(
    offset: bigint,
    limit: bigint
  ): Promise<Array<Erc20CollateralPool | PoolObject>> {
    throw new Error(
      `Method not implemented. ${offset.toString()}, ${limit.toString()}`
    )
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
    pool: Pool
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (!ethers.isAddress(pool.collateralToken)) {
      throw new Error(
        'Collateral token does not follow the ethereum address format'
      )
    }

    if (!ethers.isAddress(pool.collateralTokenChainlink)) {
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

    const pop = await this.contract.addPool.populateTransaction(pool)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  addPool(pool: Pool): Promise<void> {
    throw new Error(`Method not implemented. ${pool.collateralToken}`)
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
