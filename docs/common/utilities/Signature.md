# Solidity API

## Signature

@author Briky Team

 @notice Utility library for EIP-191 signature verification with nonce.

### verify

```solidity
function verify(address _signer, bytes _message, uint256 _nonce, bytes _signature) internal pure returns (bool)
```

@notice Verify a signature is signed by a specific address with anticipated message and nonce.

         Name        Description
 @param  _signer     Expected signer address.
 @param  _message    Anticipated message bytes.
 @param  _nonce      Number used once combined with the message to prevent replay attacks.
 @param  _signature  65-byte ECDSA signature.

 @return Whether `_signature` is signed by `_signer` for data `_message` and `_nonce`.

