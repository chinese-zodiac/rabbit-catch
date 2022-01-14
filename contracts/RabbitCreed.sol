// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity ^0.8.4;

import "./metatx/EIP712MetaTransaction.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";

contract RabbitCreed is EIP712MetaTransaction, PullPayment {
    mapping(string => address) public codeToAccount;
    mapping(address => string) public accountToCode;

    mapping(address => uint256) public rewards;

    constructor() EIP712MetaTransaction("@RabbitCatch/RabbitCreed", "1.0.0") {}

    function isValidCode(string calldata _code) public returns (bool) {
        return true;
    }

    function unregister() public {
        string storage code = accountToCode[msgSender()];
        delete codeToAccount[code];
        delete accountToCode[msgSender()];
    }

    function register(string calldata _code) public {
        require(isValidCode(_code));
        unregister();
        codeToAccount[_code] = msgSender();
        accountToCode[msgSender()] = _code;
    }

    function addRewards(string calldata _code) external payable {
        _asyncTransfer(codeToAccount[_code], address(this).balance);
    }
}
