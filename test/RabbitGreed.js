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

describe("RabbitGreed", function () {
  let owner, trader, trader1, trader2, trader3;
  let deployer;
  let rabbitGreed;
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

    const RabbitGreed = await ethers.getContractFactory("RabbitGreed");
    rabbitGreed = await RabbitGreed.deploy(
      rabbitRocket.address
    );

  });
  it("Should only make buyer first place if only one buyer", async function () {
    await rabbitGreed.increaseTotalBuys(trader3.address,1);
    await rabbitGreed.increaseTotalBuys(trader3.address,1);
    await rabbitGreed.increaseTotalBuys(trader3.address,1);
    const first = await rabbitGreed.first();
    const second = await rabbitGreed.second();
    const third = await rabbitGreed.third();
    expect(first).to.eq(trader3.address);
    expect(second).to.eq(ethers.constants.AddressZero);
    expect(third).to.eq(ethers.constants.AddressZero);

  });
  it("Should increase total buys and top buyers", async function () {
    await rabbitGreed.increaseTotalBuys(trader1.address,5,{value:parseEther("1")});
    await rabbitGreed.increaseTotalBuys(trader2.address,10,{value:parseEther("1")});
    await rabbitGreed.increaseTotalBuys(trader3.address,1,{value:parseEther("1")});
    await rabbitGreed.increaseTotalBuys(trader.address,1,{value:parseEther("1")});
    await rabbitGreed.increaseTotalBuys(trader1.address,6,{value:parseEther("1")});
    const first = await rabbitGreed.first();
    const second = await rabbitGreed.second();
    const third = await rabbitGreed.third();
    expect(first).to.eq(trader1.address);
    expect(second).to.eq(trader2.address);
    expect(third).to.eq(trader3.address);
  });
  it("Should accept BNB deposits and send reweards", async function () {
    await time.increase(time.duration.days(3));
    await rabbitGreed.sendRewards();
    const payments1 = await rabbitGreed.payments(trader1.address);
    const payments2 = await rabbitGreed.payments(trader2.address);
    const payments3 = await rabbitGreed.payments(trader3.address);
    expect(payments1).to.eq(parseEther("2.5"));
    expect(payments2).to.eq(parseEther("1.25"));
    expect(payments3).to.eq(parseEther("1.25"));
  });
});
