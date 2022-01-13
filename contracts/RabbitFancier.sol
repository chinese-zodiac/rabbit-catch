// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity ^0.8.4;

import "./metatx/EIP712MetaTransaction.sol";
import "./RabbitRocket.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";

contract RabbitFancier is
    AccessControlEnumerable,
    Ownable,
    EIP712MetaTransaction,
    PullPayment
{
    bytes32 public constant MASTER_ROLE = keccak256("MASTER_ROLE");
    RabbitRocket rabbitRocket;

    constructor(RabbitRocket _rabbitRocket)
        EIP712MetaTransaction("@RabbitCatch/RabbitFancier", "1.0.0")
        Ownable()
    {
        _setupRole(MASTER_ROLE, msgSender());
        rabbitRocket = _rabbitRocket;
    }

    function addToRewards() external payable {}

    function sendRewards(
        address _first,
        address _second,
        address _third
    ) external onlyRole(MASTER_ROLE) {
        require(rabbitRocket.isOver(), "RabbitGreed: RabbitRocket Is Not Over");
        _asyncTransfer(_first, address(this).balance / 2);
        _asyncTransfer(_second, address(this).balance / 2);
        _asyncTransfer(_third, address(this).balance);
    }

    function setRabbitRocket(RabbitRocket _to) public onlyOwner {
        rabbitRocket = _to;
    }
}
