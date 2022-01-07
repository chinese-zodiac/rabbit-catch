// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// If you read this, know that I love you even if your mom doesnt <3
const chai = require('chai');
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { ethers, config } = require('hardhat');
const { time } = require("@openzeppelin/test-helpers");
const { toNum, toBN } = require("./utils/bignumberConverter");

describe("RabbitBreed", function () {
  let owner, trader, trader1, trader2, trader3;
  let deployer;
  let rabbitBreed;
  let rabbitRocket;
  //TODO: add tests
  it("Should accept BNB deposits", async function () {

  });
});
