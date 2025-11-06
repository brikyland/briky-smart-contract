# Solidity API

## Pausable

@author Briky Team

 @notice A `Pausable` contract applies pausing mechanism on its methods and can be paused by admins for maintenance or
         damage control on attacks.

### pause

```solidity
function pause(bytes[] _signatures) external
```

@notice Pause contract.
 @notice For maintenance only.

         Name            Description
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### unpause

```solidity
function unpause(bytes[] _signatures) external
```

@notice Unpause contract.
 @notice After maintenance completes.

         Name            Description
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

