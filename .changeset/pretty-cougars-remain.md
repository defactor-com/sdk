---
"@defactor/defactor-sdk": major
---

Support new version of the Staking contract

### Breaking changes

  - Rename `Staking` class and artifacts to `StakingV1`

  #### Details

  - To migrate from older versions it is needed to rename every `Staking` reference to `StakingV1` in order to interact with the first version of the Staking contracts.

  **Before**

    ```typescript
    new Staking(STAKING_CONTRACT_ADDRESS, PROVIDER_URL, PRIVATE_KEY, miscStaking.abi);
    ```

    **After**

    ```typescript
    new StakingV1(STAKING_CONTRACT_ADDRESS, PROVIDER_URL, PRIVATE_KEY, miscStakingV1.abi);
    ```
