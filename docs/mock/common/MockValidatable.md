# Solidity API

## MockValidatable

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### VERSION

```solidity
string VERSION
```

### initialize

```solidity
function initialize(address _admin, address _validator) external
```

### testValidatableInitWhenNotInitilizing

```solidity
function testValidatableInitWhenNotInitilizing(address _validator) external
```

### testValidation

```solidity
function testValidation(string _content, struct IValidation.Validation _validation) external
```

### version

```solidity
function version() external pure returns (string)
```

Name        Description
 @return version     Version of implementation.

