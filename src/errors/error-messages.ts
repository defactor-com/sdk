export const poolCommonErrorMessage = {
  contractIsPaused: 'The contract is paused',
  addressIsNotAdmin: 'Sender address is not admin',
  noExistPoolId: (poolId: bigint) =>
    `Pool id ${poolId.toString()} does not exist`,
  noSupportedPoolStatus: (poolStatus: bigint) =>
    `The status ${poolStatus.toString()} is not supported`,
  wrongAddressFormat: `Address does not follow the ethereum address format`,
  noNegativeAmountOrZero: 'Amount cannot be negative or 0'
}

export const erc20CollateralPoolErrorMessage = {
  wrongAddressFormatCustom: (text?: string) =>
    `Collateral token${text ? ' ' + text : ''} does not follow the ethereum address format`,
  noExistLendingId: (lendingId: bigint) =>
    `Lending id ${lendingId.toString()} does not exist`,
  noExistBorrowId: (borrowId: bigint) =>
    `Borrow id ${borrowId.toString()} does not exist`,
  noNegativeOffset: 'Offset cannot be negative',
  noNegativeLimitOrZero: 'Limit cannot be negative or 0',
  maxLimitAllowed: 'Max limit allowed is 1000',
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

export const counterPartyPoolErrorMessage = {
  addressIsNotOwner: 'Sender address is not the owner of the pool',
  poolOwnerCannotCommitToHisOwnPool: 'Pool owner cannot commit to his own pool',
  softCapMustBeLessThanHardCap: 'Soft cap must be less than hard cap',
  deadlineMustBeInFuture: 'Deadline must be in the future',
  deadlineMustNotBeMoreThan1YearInTheFuture:
    'Deadline must not be more than one year in the future',
  noNegativeSoftCapOrZero: 'Soft cap cannot be negative or 0',
  noNegativeMinimumAPR: 'Minimum APR cannot be negative',
  deadlineReached: 'Deadline has been reached',
  deadlineNotReached: 'Deadline not reached',
  softCapNotReached: 'Soft cap not reached',
  amountExceedsHardCap: 'The amount exceeds the harp cap',
  cannotCollectDaysAfterDeadline: (days: bigint) =>
    `Cannot collect ${days} days after deadline`,
  poolStatusMustBe: (
    poolId: bigint,
    poolStatus: string,
    expectedStatus: string
  ) =>
    `Pool ${poolId.toString()} status is ${poolStatus}, it must be ${expectedStatus}`
}
