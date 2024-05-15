import { ethers } from 'ethers'

import { Erc20, Pools, SelfProvider } from '../src'
import { CollateralToken } from '../src/types/pools'

export const ERC20_COLLATERAL_POOL_ETH_ADDRESS =
  '0x615e1f7970363Fbf7A1843eFc16f0E4e685610F9'
export const POOLS_ETH_ADDRESS = '0xc9BB84fCE54C27C159Cbef4cb45A922018cFF675'
export const ADMIN_TESTING_PRIVATE_KEY =
  '0e4c892c70c33065a8d20276d5193294f11fca2a4f99012c79590a0c0cc5a6c3'
export const TESTING_PRIVATE_KEY =
  '3f6ab2861d48fa2d6ca54977de99a078d7427eb7942a03a37c8d165ec89ebb48'
export const TESTING_PUBLIC_KEY = '0x0FEEe8332394aDc9eB439020DD8D38f4F93999Bd'
export const COLLATERAL_TOKEN = '0x81da82b49CD9Ee7b7d67B4655784581f30590eA1'
export const COLLATERAL_TOKEN_CHAINLINK =
  '0x997a6BCe1372baca6Bbb8db382Cb12F2dDca2b45'
export const USD_TOKEN_ADDRESS = '0x80D9E7bC3D962878b292F9536b38E52e266a77Fd'
export const COLLATERAL_ERC20_TOKENS = [
  { address: '0x60E87395b0101F85C623c38Be010574f958496db', precision: 6 },
  { address: '0x122336B4c95d8061A8b280e2Ccf221eC6A9A6aE8', precision: 4 }
]

export const loadEnv = async (): Promise<void> => {
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env' })
}

export const MAX_BIGINT = BigInt(2) * BigInt(10) ** BigInt(18)

export const ONE_MS = 1000
export const ONE_SEC = 1
export const ONE_SEC_MS = ONE_SEC * ONE_MS
export const ONE_DAY_SEC = 86400
export const ONE_DAY_MS = ONE_DAY_SEC * 1000

export const waitUntilConfirmationCompleted = async (
  provider: ethers.JsonRpcProvider,
  tx: ethers.ContractTransaction | ethers.TransactionResponse
) => {
  if (tx instanceof ethers.TransactionResponse) {
    await provider.waitForTransaction(tx.hash)
  }
}

export const getUnixEpochTime = () => BigInt(Math.floor(Date.now() / 1000))

export const getUnixEpochTimeInFuture = (seconds: bigint) => {
  if (seconds <= 0) throw new Error('seconds must be positive')

  return getUnixEpochTime() + seconds
}

export const approveTokenAmount = async (
  contract: Erc20,
  provider: SelfProvider<Pools>,
  amount: bigint
) => {
  const tx = await contract.approve(provider.contract.address, BigInt(amount))

  await waitUntilConfirmationCompleted(provider.contract.jsonRpcProvider, tx)
}

export const approveCreationFee = async (
  contract: Erc20,
  provider: SelfProvider<Pools>,
  signerAddress: string,
  creationFee: bigint
) => {
  const usdcApproved = await contract.allowance(
    signerAddress,
    provider.contract.address
  )

  if (usdcApproved < creationFee) {
    await approveTokenAmount(contract, provider, creationFee)
  }
}

export const approveCollateral = async (
  provider: SelfProvider<Pools>,
  signerAddress: string,
  collaterals: Array<CollateralToken>,
  creationFee: bigint
) => {
  const amountByCollateral = collaterals.reduce(
    (res: Record<string, bigint>, curr) => {
      if (!res[curr.contractAddress]) {
        res[curr.contractAddress] = BigInt(0)
      }

      res[curr.contractAddress] += curr.amount

      return res
    },
    {}
  )

  for (const address of Object.keys(amountByCollateral)) {
    const isUsdc = USD_TOKEN_ADDRESS === address
    const erc20Contract = new Erc20(
      address,
      provider.contract.apiUrl,
      TESTING_PRIVATE_KEY
    )

    const erc20Approved = await erc20Contract.allowance(
      signerAddress,
      provider.contract.address
    )

    const amountRequired =
      amountByCollateral[address] + (isUsdc ? creationFee : BigInt(0))

    if (erc20Approved < amountRequired) {
      await approveTokenAmount(erc20Contract, provider, amountRequired)
    }
  }
}

export const getRandomERC20Collaterals = (
  max: number
): Array<CollateralToken> => {
  const collaterals = []

  for (let index = 0; index < max; index++) {
    const token =
      COLLATERAL_ERC20_TOKENS[
        Math.floor(index / (max / COLLATERAL_ERC20_TOKENS.length))
      ]

    collaterals.push({
      contractAddress: token.address,
      amount: BigInt(10 ** token.precision),
      id: null
    })
  }

  return collaterals
}

export const setPause = async (
  provider: SelfProvider<Pools>,
  value: boolean
) => {
  const isPaused = await provider.contract.isPaused()

  if (isPaused === value) return

  const txPause = value
    ? await provider.contract.pause()
    : await provider.contract.unpause()

  await waitUntilConfirmationCompleted(
    provider.contract.jsonRpcProvider,
    txPause
  )
}
