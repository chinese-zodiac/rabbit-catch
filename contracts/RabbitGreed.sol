// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity ^0.8.4;

import "./metatx/EIP712MetaTransaction.sol";
import "./RabbitRocket.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";

contract RabbitGreed is AccessControlEnumerable, EIP712MetaTransaction, PullPayment {
    bytes32 public constant MASTER_ROLE = keccak256("MASTER_ROLE");

    mapping(address=>uint32) totalBuys;

    address public first;
    address public second;
    address public third;

    RabbitRocket rabbitRocket;

    constructor(RabbitRocket _rabbitRocket) EIP712MetaTransaction("@RabbitCatch/RabbitGreed","1.0.0") {
        _setupRole(MASTER_ROLE, msgSender());
        rabbitRocket = _rabbitRocket;
    }

    function increaseTotalBuys(address _for, uint32 _amount) external payable onlyRole(MASTER_ROLE) {
        require(!rabbitRocket.isOver(),"RabbitGreed: RabbitRocket is over");
        totalBuys[_for] += _amount;
        if(totalBuys[_for] > totalBuys[first]) {
            third = second;
            second = first;
            first = _for;
            return;
        }
        if(totalBuys[_for] > totalBuys[second]) {
            third = second;
            second = _for;
            return;
        }
        if(totalBuys[_for] > totalBuys[third]) {
            third = _for;
            return;
        }
    }

    function sendRewards() external {
        require(rabbitRocket.isOver(),"RabbitGreed: RabbitRocket Is Not Over");
        _asyncTransfer(first, address(this).balance / 2);
        _asyncTransfer(second, address(this).balance / 2);
        _asyncTransfer(third, address(this).balance);
    }


}