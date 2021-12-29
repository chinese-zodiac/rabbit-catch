// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity ^0.8.4;

import "./metatx/EIP712MetaTransaction.sol";

contract RabReferralRegistry is EIP712MetaTransaction {
    mapping(string=>address) public codeToAccount;
    mapping(address=>string) public accountToCode;

    constructor() EIP712MetaTransaction("@RabbitCatch/RabReferralRegistry","1.0.0") {}

    function unregister() public {
        string storage code = accountToCode[msgSender()];
        delete codeToAccount[code];
        delete accountToCode[msgSender()];
    }

    function register(string calldata _code) public {
        unregister();
        codeToAccount[_code] = msgSender();
        accountToCode[msgSender()] = _code;
    }
}