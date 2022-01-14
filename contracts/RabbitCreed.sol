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

    function isValidNewCode(string calldata _code) public view returns (bool) {
        return !isCodeRegistered(_code);
    }

    function isCodeRegistered(string calldata _code)
        public
        view
        returns (bool)
    {
        return codeToAccount[_code] != address(0);
    }

    function unregister() public {
        string storage code = accountToCode[msgSender()];
        delete codeToAccount[code];
        delete accountToCode[msgSender()];
    }

    function register(string calldata _code) public {
        require(isValidNewCode(_code), "RabbitCreed: Not valid new code");
        unregister();
        codeToAccount[_code] = msgSender();
        accountToCode[msgSender()] = _code;
    }

    function addRewards(string calldata _code) external payable {
        require(isCodeRegistered(_code), "RabbitCreed: Code not registered");
        _asyncTransfer(codeToAccount[_code], address(this).balance);
    }
}
