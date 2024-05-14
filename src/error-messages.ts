export const poolCommonErrorMessage = {
  noExistPoolId: (poolId: bigint) =>
    `Pool id ${poolId.toString()} does not exist`,
  noSupportedPoolStatus: (poolStatus: bigint) =>
    `The status ${poolStatus.toString()} is not supported`,
  wrongAddressFormat: `Address does not follow the ethereum address format`,
  noNegativeAmountOrZero: 'Amount cannot be negative or 0'
}

export const ecpErrorMessage = {
  wrongAddressFormat: `Address does not follow the ethereum address format`,
  wrongAddressFormatCustom: (text?: string) =>
    `Collateral token${text ? ' ' + text : ''} does not follow the ethereum address format`,
  noExistPoolId: (poolId: bigint) =>
    `Pool id ${poolId.toString()} does not exist`,
  noExistLendingId: (lendingId: bigint) =>
    `Lending id ${lendingId.toString()} does not exist`,
  noExistBorrowId: (borrowId: bigint) =>
    `Borrow id ${borrowId.toString()} does not exist`,
  noNegativeOffset: 'Offset cannot be negative',
  noNegativeLimitOrZero: 'Limit cannot be negative or 0',
  noNegativeAmountOrZero: 'Amount cannot be negative or 0',
  maxLimitAllowed: 'Max limit allowed is 1000',
  addressIsNotAdmin: 'Sender address is not admin',
  endTimeReached: 'Pool has ended',
  poolIsNotClosed: 'Pool is not closed',
  poolIsClosed: 'Pool is closed',
  poolIsNotCompleted: 'Pool is not completed',
  loanAlreadyClaimed: 'Loan already claimed',
  poolCannotBeLiquidated: 'Pool cannot be liquidated',
  timeMustBeInFuture: 'Time must be in the future',
  amountOverpassPoolBalance: 'Amount overpass the pool available amount',
  borrowAlreadyRepaid: 'Borrow already repaid'
}

export const cppErrorMessage = {
  softCapMustBeLessThanHardCap: 'Soft cap must be less than hard cap',
  deadlineMustBeInFuture: 'Deadline must be in the future',
  noNegativeSoftCapOrZero: 'Amount cannot be negative or 0',
  deadlineReached: 'Deadline has been reached',
  poolIsNotCreated: (poolId: bigint, status: string) =>
    `Pool ${poolId.toString()} status is ${status}, it must be CREATED`,
  amountExceedsHardCap: 'The amount exceeds the harp cap'
}
