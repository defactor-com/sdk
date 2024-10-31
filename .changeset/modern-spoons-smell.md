---
"@defactor/defactor-sdk": major
---

Support new version of the ERC20 Collateral Pool contract

### Breaking changes

  - The collateral details in `ERC20CollateralPool` class that implements the erc20 collateral pool contract now require `maxLended`, `minLended`, and `minBorrow`.

  - The `LIQUIDATION_FEE` in the `ERC20CollateralPool` base class has changed from 5 to 10.

  - The `OZ_IN_G` was removed from the `ERC20CollateralPool` base class and the classes from which it inherits.
