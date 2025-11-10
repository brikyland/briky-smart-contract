# Signature

Utility library for EIP-191 signature verification with nonce.

## verify

```solidity
function verify(address _signer, bytes _message, uint256 _nonce, bytes _signature) internal pure returns (bool)
```

Verify a signature is signed by a specific address with anticipated message and nonce.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _signer | address | Expected signer address. |
| _message | bytes | Anticipated message bytes. |
| _nonce | uint256 | Number used once combined with the message to prevent replay attacks. |
| _signature | bytes | 65-byte ECDSA signature. |

### Return Values

Whether `_signature` is signed by `_signer` for data `_message` and `_nonce`.

