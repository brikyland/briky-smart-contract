# Solidity API

## CurrencyHandler

@author Briky Team

 @notice Utility library for interacting with cryptocurrencies, compatible with both native coin and ERC-20 tokens.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### InsufficientValue

```solidity
error InsufficientValue()
```

===== ERROR ===== *

### FailedTransfer

```solidity
error FailedTransfer()
```

### FailedRefund

```solidity
error FailedRefund()
```

### sendNative

```solidity
function sendNative(address _receiver, uint256 _value) internal
```

@notice Transfer an amount of native coin from this contract to a receiver.

         Name        Description
 @param  _receiver   Receiver address.
 @param  _value      Amount of native coin.

### receiveNative

```solidity
function receiveNative(uint256 _value) internal
```

@notice Transfer an amount of native coin from the message sender to this contract.

         Name        Description
 @param  _value      Amount of native coin.

### forwardNative

```solidity
function forwardNative(address _receiver, uint256 _value) internal
```

@notice Transfer an amount of native coin from the message sender to a receiver.

         Name        Description
 @param  _receiver   Receiver address.
 @param  _value      Amount of native coin.

### sendERC20

```solidity
function sendERC20(address _currency, address _receiver, uint256 _value) internal
```

@notice Transfer an amount of ERC-20 token from this contract to a receiver.

         Name        Description
 @param  _currency   Token address.
 @param  _receiver   Receiver address.
 @param  _value      Amount of ERC-20 token.

### receiveERC20

```solidity
function receiveERC20(address _currency, uint256 _value) internal
```

@notice Transfer an amount of ERC-20 token from the message sender to this contract.

         Name        Description
 @param  _currency   Token address.
 @param  _value      Amount of ERC-20 token.

### forwardERC20

```solidity
function forwardERC20(address _currency, address _receiver, uint256 _value) internal
```

@notice Transfer an amount of ERC-20 token from the message sender to a receiver.

         Name        Description
 @param  _currency   Token address.
 @param  _receiver   Receiver address.
 @param  _value      Amount of ERC-20 token.

### allowERC20

```solidity
function allowERC20(address _currency, address _spender, uint256 _value) internal
```

@notice Approve a new amount of ERC-20 token for a spender.

         Name        Description
 @param  _currency   Token address.
 @param  _spender    Spender address.
 @param  _value      Amount of ERC-20 token.

### sendCurrency

```solidity
function sendCurrency(address _currency, address _receiver, uint256 _value) internal
```

@notice Transfer an amount of either ERC-20 token or native coin from this contract to a receiver.

         Name        Description
 @param  _currency   Token address or zero address.
 @param  _receiver   Receiver address.
 @param  _value      Amount of ERC-20 token or native coin.

### receiveCurrency

```solidity
function receiveCurrency(address _currency, uint256 _value) internal
```

@notice Transfer an amount of either ERC-20 token or native coin from the message sender to this contract.

         Name        Description
 @param  _currency   Token address or zero address.
 @param  _value      Amount of ERC-20 token or native coin.

### forwardCurrency

```solidity
function forwardCurrency(address _currency, address _receiver, uint256 _value) internal
```

@notice Transfer an amount of either ERC-20 token or native coin from the message sender to a receiver.

         Name        Description
 @param  _currency   Token address or zero address.
 @param  _receiver   Receiver address.
 @param  _value      Amount of ERC-20 token or native coin.

