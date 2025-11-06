# Solidity API

## ReserveVaultStorage

@author Briky Team

 @notice Storage contract for contract `ReserveVault`.

### funds

```solidity
mapping(uint256 => struct IFund.Fund) funds
```

_funds[fundId]_

### isProvider

```solidity
mapping(address => bool) isProvider
```

_isProvider[account]_

### fundNumber

```solidity
uint256 fundNumber
```

Name        Description
 @return fundNumber  Number of funds.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

