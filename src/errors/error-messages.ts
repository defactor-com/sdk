export const commonErrorMessage = {
  contractIsPaused: 'The contract is paused',
  addressIsNotAdmin: 'Sender address is not admin'
}

export const poolCommonErrorMessage = {
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
  poolOwnerCannotCommitToTheirOwnPool:
    'The pool owner cannot make a commit on their own pool',
  softCapMustBeLessThanHardCap: 'Soft cap must be less than hard cap',
  deadlineMustBeInFuture: 'Deadline must be in the future',
  deadlineMustNotBeMoreThan1YearInTheFuture:
    'Deadline must not be more than one year in the future',
  noNegativeSoftCap: 'Soft cap cannot be negative',
  noNegativeMinimumAPR: 'Minimum APR cannot be negative',
  deadlineReached: 'Deadline has been reached',
  deadlineNotReached: 'Deadline not reached',
  softCapReached: 'Soft cap reached',
  softCapNotReached: 'Soft cap not reached',
  deadlineAndSoftCapReached: 'Deadline and soft cap reached',
  amountExceedsHardCap: 'The amount exceeds the harp cap',
  mustDepositAtLeastCommittedAmount: 'Must deposit at least committed amount',
  poolHasNoRewards: 'No rewards have been deposited into the pool',
  poolOwnerCannotClaimToTheirOwnPool:
    'The pool owner cannot make a claim on their own pool',
  mustCommitBeforeClaim: 'Must commit to pool before to claim rewards',
  poolOwnerCannotUncommitToTheirOwnPool:
    'The pool owner cannot make an un-commit on their own pool',
  poolHasNoCommittedAmount: 'No amount has been committed to the pool',
  poolAlreadyClaimed: 'Pool rewards have already been claimed',
  committedAmountMustBeZero: 'The committed amount must be zero',
  rewardsHaveNotYetBeenPaidOut: 'Rewards have not yet been paid',
  cannotArchiveBeforeClosedTime: (days: bigint) =>
    `${days} days must have passed after the closed time to archive the pool`,
  cannotArchiveBeforeDeadline: (days: bigint) =>
    `${days} days must have passed after the deadline to archive the pool`,
  mustBeOwnerOrAdmin:
    'Sender address is not the owner of the pool or the admin',
  cannotCollectDaysAfterDeadline: (days: bigint) =>
    `Cannot collect ${days} days after deadline`,
  poolStatusMustBe: (
    poolId: bigint,
    poolStatus: string,
    expectedStatus: Array<string>
  ) =>
    `Pool ${poolId.toString()} status is ${poolStatus}, it must be ${expectedStatus.sort().join(', or ')}`
}

export const stakingErrorMessage = {
  nonNegativeLockDuration: 'Lock duration cannot be negative',
  nonNegativeApy: 'APY cannot be negative'
}
