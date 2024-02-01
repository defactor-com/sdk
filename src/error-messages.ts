export const ecpErrorMessage = {
  wrongAddressFormat: `Address does not follow the ethereum address format`,
  wrongAddressFormatCustom: (text?: string) =>
    `Collateral token${text ? ' ' + text : ''} does not follow the ethereum address format`,
  noExistPoolId: (poolId: bigint) =>
    `Pool id ${poolId.toString()} does not exist`,
  noExistLendingId: (lendingId: bigint) =>
    `Lending id ${lendingId.toString()} does not exist`,
  noNegativeOffset: 'Offset cannot be negative',
  noNegativeLimitOrZero: 'Limit cannot be negative or 0',
  noNegativeAmountOrZero: 'Amount cannot be negative or 0',
  maxLimitAllowed: 'Max limit allowed is 1000',
  addressIsNotAdmin: 'Sender address is not admin'
}
