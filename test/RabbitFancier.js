// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// If you read this, know that I love you even if your mom doesnt <3
const chai = require('chai');
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { ethers, config } = require('hardhat');
const { time } = require("@openzeppelin/test-helpers");
const { toNum, toBN } = require("./utils/bignumberConverter");
const { expect } = require('chai');

const { parseEther } = ethers.utils;

describe("RabbitFancier", function () {
  let owner, trader, trader1, trader2, trader3;
  let deployer;
  let rabbitFancier;
  let rabbitRocket;
  before(async function() {
    [owner, trader, trader1, trader2, trader3] = await ethers.getSigners();

    const RabbitRocket = await ethers.getContractFactory("RabbitRocket");
    const startTime = (await time.latest()).toNumber();
    rabbitRocket = await RabbitRocket.deploy(
      startTime + 3600,//uint32 _startEpoch,
      startTime + 3600 + 86400,//uint32 _whitelistEndEpoch,
      86400//uint32 _countdownSeconds
    );

    const RabbitFancier = await ethers.getContractFactory("RabbitFancier");
    rabbitFancier = await RabbitFancier.deploy(
      rabbitRocket.address
    );

  });
  it("Should accept BNB deposits and send reweards", async function () {
    await time.increase(time.duration.days(5));
    await rabbitFancier.addToRewards({value:parseEther("1")});
    await rabbitFancier.sendRewards(
      trader1.address,
      trader2.address,
      trader3.address,
    );
    const payments1 = await rabbitFancier.payments(trader1.address);
    const payments2 = await rabbitFancier.payments(trader2.address);
    const payments3 = await rabbitFancier.payments(trader3.address);
    expect(payments1).to.eq(parseEther("0.5"));
    expect(payments2).to.eq(parseEther("0.25"));
    expect(payments3).to.eq(parseEther("0.25"));
  });
});
