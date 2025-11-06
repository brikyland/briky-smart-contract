# Solidity API

## Administrable

@author Briky Team

 @notice A `Administrable` contract need to query administrative information from the `Admin` contract for its operations.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### onlyManager

```solidity
modifier onlyManager()
```

@notice Verify the message sender is an authorized manager.

### onlyExecutive

```solidity
modifier onlyExecutive()
```

@notice Verify the message sender is an authorized manager or an authorized moderator.

### validGovernor

```solidity
modifier validGovernor(address _account)
```

@notice Verify an account is an authorized governor contract.

         Name        Description
 @param  _account    EVM address.

### onlyAvailableCurrency

```solidity
modifier onlyAvailableCurrency(address _currency)
```

@notice Verify a currency is interactable within the system.

         Name        Description
 @param  _currency   Currency address.

