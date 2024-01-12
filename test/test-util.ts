export const INSTANCE_ETH_ADDRESS = '0x615e1f7970363Fbf7A1843eFc16f0E4e685610F9'
export const ADMIN_TESTING_PRIVATE_KEY =
  '0e4c892c70c33065a8d20276d5193294f11fca2a4f99012c79590a0c0cc5a6c3'
export const TESTING_PRIVATE_KEY =
  '3f6ab2861d48fa2d6ca54977de99a078d7427eb7942a03a37c8d165ec89ebb48'
export const COLLATERAL_TOKEN = '0x81da82b49CD9Ee7b7d67B4655784581f30590eA1'
export const COLLATERAL_TOKEN_CHAINLINK =
  '0x997a6BCe1372baca6Bbb8db382Cb12F2dDca2b45'

export const loadEnv = async (): Promise<void> => {
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env' })
}
