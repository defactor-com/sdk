import { ethers } from 'ethers'

import { miscErc20CollateralPool } from './artifacts'
import {
  AdminFunctions,
  BaseContract,
  Erc20CollateralTokenPoolDetail,
  Views
} from './base-contract'
import {
  Functions,
  Lend,
  Pool,
  PoolInput
} from './types/erc20-collateral-token'
import { PoolCommit } from './types/pools'
import { Abi, PrivateKey } from './types/types'
import { NULL_ADDRESS, Role } from './util'

export class ERC20CollateralPool
  extends BaseContract
  implements Functions, Views, AdminFunctions
{
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscErc20CollateralPool.abi)
  }

  async LIQUIDATION_PROTOCOL_FEE(): Promise<bigint> {
    return await this.contract.LIQUIDATION_PROTOCOL_FEE()
  }

  async getUsdc(): Promise<string> {
    return await this.contract.USDC()
  }

  private existPool(pool: Pool): boolean {
    // logic taken from the smart contract validation
    return pool.collateralDetails.collateralToken !== NULL_ADDRESS
  }

  private async _getPoolById(poolId: bigint): Promise<Pool | null> {
    const pool = await this.contract.pools(poolId)

    if (!this.existPool(pool)) {
      return null
    }

    return pool
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

  async _getTotalLending(poolId: bigint, address: string): Promise<bigint> {
    return await this.contract.lendingsLength(poolId, address)
  }

  async getTotalLending(poolId: bigint, address: string): Promise<bigint> {
    if (!ethers.isAddress(address)) {
      throw new Error('Address does not follow the ethereum address format')
    }

    await this.getPool(poolId)

    return await this._getTotalLending(poolId, address)
  }

  private async _getLoan(
    poolId: bigint,
    address: string,
    lendingId: bigint
  ): Promise<Lend> {
    return await this.contract.lendings(poolId, address, lendingId)
  }

  async getLoan(
    poolId: bigint,
    address: string,
    lendingId: bigint
  ): Promise<Lend> {
    if (!ethers.isAddress(address)) {
      throw new Error('Address does not follow the ethereum address format')
    }

    const totalLending = await this._getTotalLending(poolId, address)

    await this.getPool(poolId)

    if (lendingId >= totalLending) {
      throw new Error(`Lending id ${lendingId.toString()} does not exist`)
    }

    return await this._getLoan(poolId, address, lendingId)
  }

  async listLoansByLender(
    offset: bigint,
    limit: bigint,
    poolId: bigint,
    lenderAddress: string
  ): Promise<Array<Lend>> {
    if (offset < 0) {
      throw new Error(`Offset cannot be negative`)
    }

    if (limit <= 0) {
      throw new Error(`Limit cannot be negative or 0`)
    }

    // TODO: consider taking this parameter (1000) from a configuration file or some configurable approach
    if (limit > 1000) {
      throw new Error(`Max limit allowed is 1000`)
    }

    if (!ethers.isAddress(lenderAddress)) {
      throw new Error('Address does not follow the ethereum address format')
    }

    await this.getPool(poolId)

    const loanPromises = new Array<Promise<Lend>>()
    const totalLending = await this._getTotalLending(poolId, lenderAddress)

    for (let i = offset; i < offset + limit && i + offset < totalLending; i++) {
      loanPromises.push(this._getLoan(poolId, lenderAddress, i))
    }

    return await Promise.all(loanPromises)
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

  async lend(
    poolId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this.getPool(poolId)

    if (amount <= 0) {
      throw new Error(`Amount cannot be negative or 0`)
    }

    const pop = await this.contract.lend.populateTransaction(poolId, amount)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
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
