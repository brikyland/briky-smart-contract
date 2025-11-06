# Solidity API

## Airdrop

@author Briky Team

 @notice The `Airdrop` contract facilitates cryptocurrency distribution in the form of an airdrop to multiple addresses.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### receive

```solidity
receive() external payable
```

@notice Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

@return Version of implementation.

### airdrop

```solidity
function airdrop(address[] _receivers, uint256[] _amounts, address _currency) external payable
```

@notice Execute an airdrop by transferring cryptocurrency to multiple receiver addresses.

         Name        Description
 @param  _receivers  Array of receiver addresses.
 @param  _amounts    Array of airdrop amount, respective to each receiver.
 @param  _currency   Airdrop currency.

