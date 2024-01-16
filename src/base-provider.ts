import {
  Pool as Erc20CollateralPool,
  Borrow,
  Lend
} from './types/erc20-collateral-token'
import { Pool as Pools, PoolCommit } from './types/pools'

type Erc20CollateralTokenPoolDetail = Borrow | Lend

/**
 * Interface for view functions.
 */
interface Views {
  /**
   * Get a specific pool by its ID.
   * @param {bigint} poolId - The ID of the pool.
   * @returns {Promise<Erc20CollateralPool | Pools>} The pool object.
   */
  getPool(poolId: bigint): Promise<Erc20CollateralPool | Pools>

  /**
   * Get a list of pools.
   * @param {bigint} offset - The offset from where to start listing pools.
   * @param {bigint} limit - The maximum number of pools to list.
   * @returns {Promise<Array<Erc20CollateralPool | Pools>>} An array of pool objects.
   */
  getPools(
    offset: bigint,
    limit: bigint
  ): Promise<Array<Erc20CollateralPool | Pools>>

  /**
   * Get details of a specific pool.
   * @param {bigint} poolId - The ID of the pool.
   * @param {string} walletAddress - The wallet address.
   * @returns {Promise<Erc20CollateralTokenPoolDetail | PoolCommit>} The pool details.
   */
  getPoolDetails(
    poolId: bigint,
    walletAddress: string
  ): Promise<Erc20CollateralTokenPoolDetail | PoolCommit>
}

/**
 * Interface for admin functions.
 */
interface AdminFunctions {
  /**
   * Pause the provider.
   * @returns {Promise<void>}
   */
  pause(): Promise<void>

  /**
   * Unpause the provider.
   * @returns {Promise<void>}
   */
  unpause(): Promise<void>
}

/**
 * Abstract class representing a base provider.
 * @abstract
 */
export abstract class BaseProvider implements Views, AdminFunctions {
  /**
   * Get a specific pool by its ID.
   * @abstract
   * @param {bigint} poolId - The ID of the pool.
   * @returns {Promise<Erc20CollateralPool | Pools>} The pool object.
   */
  abstract getPool(poolId: bigint): Promise<Erc20CollateralPool | Pools>

  /**
   * Get a list of pools.
   * @abstract
   * @param {bigint} offset - The offset from where to start listing pools.
   * @param {bigint} limit - The maximum number of pools to list.
   * @returns {Promise<Array<Erc20CollateralPool | Pools>>} An array of pool objects.
   */
  abstract getPools(
    offset: bigint,
    limit: bigint
  ): Promise<Array<Erc20CollateralPool | Pools>>

  /**
   * Get details of a specific pool.
   * @abstract
   * @param {bigint} poolId - The ID of the pool.
   * @param {string} walletAddress - The wallet address.
   * @returns {Promise<Erc20CollateralTokenPoolDetail | PoolCommit>} The pool details.
   */
  abstract getPoolDetails(
    poolId: bigint,
    walletAddress: string
  ): Promise<Erc20CollateralTokenPoolDetail | PoolCommit>

  /**
   * Pause the provider.
   * @abstract
   * @returns {Promise<void>}
   */
  abstract pause(): Promise<void>

  /**
   * Unpause the provider.
   * @abstract
   * @returns {Promise<void>}
   */
  abstract unpause(): Promise<void>
}
