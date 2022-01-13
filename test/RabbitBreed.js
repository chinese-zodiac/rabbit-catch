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

describe("RabbitBreed", function () {
  let owner, trader, trader1, trader2, trader3;
  let deployer;
  let rabbitBreed;
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

    const RabbitBreed = await ethers.getContractFactory("RabbitBreed");
    rabbitBreed = await RabbitBreed.deploy(
      rabbitRocket.address
    );

  });
  it("Should accept BNB deposits and send reweards", async function () {
    await time.increase(time.duration.days(5));
    await rabbitBreed.addToRewards({value:parseEther("1")});
    await rabbitBreed.sendRewards(
      trader1.address,
      trader2.address,
      trader3.address,
    );
    const payments1 = await rabbitBreed.payments(trader1.address);
    const payments2 = await rabbitBreed.payments(trader2.address);
    const payments3 = await rabbitBreed.payments(trader3.address);
    expect(payments1).to.eq(parseEther("0.5"));
    expect(payments2).to.eq(parseEther("0.25"));
    expect(payments3).to.eq(parseEther("0.25"));
  });
});
