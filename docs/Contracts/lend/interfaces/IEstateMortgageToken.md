# IEstateMortgageToken

Interface for contract `IEstateMortgageToken`.

A `IEstateMortgageToken` contract facilitates peer-to-peer lending secured by estate tokens as collateral. Each
provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
borrower or foreclose on the collateral from the contract once overdue.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

