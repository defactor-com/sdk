---
"@defactor/defactor-sdk": major
---

Add `ERC20CollateralPoolV2` to support the new contract version, apply `StakingV2` changes and modify `Stake` position type

### Breaking changes

#### Details

##### BuybackV2

- Update `miscBuyback` abi

##### ERC20CollateralPoolV2

- Add `ERC20CollateralPoolV2` class with its new types, abi and logic
- Rename old `ERC20CollateralPool` to `ERC20CollateralPoolV1`

**Before**

```typescript
new ERC20CollateralPool(ERC20_COLLATERAL_POOL_CONTRACT_ADDRESS, PROVIDER_URL, PRIVATE_KEY, miscErc20CollateralPool.abi);
```

**After**

```typescript
new ERC20CollateralPoolV1(ERC20_COLLATERAL_POOL_CONTRACT_ADDRESS, PROVIDER_URL, PRIVATE_KEY, miscErc20CollateralPoolV1.abi);
```

##### StakingV2

-   Update `Stake` from `StakingV2` types
-   Add new dates validation into `addPlan` 
-   Update `stake`, `restake`, `claimRewards` and `claimAllRewards` validations
-   Remove `withdraw` function
