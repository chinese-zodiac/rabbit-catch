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

describe("RabbitRocket", function () {
  let owner, trader, trader1, trader2, trader3;
  let rabbitRocket;
  let startTime;
  before(async function() {
    [owner, trader, trader1, trader2, trader3] = await ethers.getSigners();
    const RabbitRocket = await ethers.getContractFactory("RabbitRocket");
    startTime = (await time.latest()).toNumber();
    rabbitRocket = await RabbitRocket.deploy(
      startTime + 3600,//uint32 _startEpoch,
      startTime + 3600 + 86400,//uint32 _whitelistEndEpoch,
      86400//uint32 _countdownSeconds
    );
  });
  it("Should set epochs", async function () {
    const startEpoch = await rabbitRocket.startEpoch();
    const whitelistEndEpoch = await rabbitRocket.whitelistEndEpoch();
    const endEpoch = await rabbitRocket.endEpoch();
    const countdownSeconds = await rabbitRocket.countdownSeconds();
    const endGameOverride = await rabbitRocket.endGameOverride();
    const lastBuyer = await rabbitRocket.lastBuyer();
    const isOver = await rabbitRocket.isOver();
    const isStarted = await rabbitRocket.isStarted();
    const isWhitelistOnly = await rabbitRocket.isWhitelistOnly();
    expect(startEpoch).to.eq(startTime+3600);
    expect(whitelistEndEpoch).to.eq(startTime+3600 + 86400);
    expect(endEpoch).to.eq(startTime+3600 + 86400+86400);
    expect(countdownSeconds).to.eq(86400);
    expect(endGameOverride).to.be.false;
    expect(lastBuyer.toString()).to.eq("0x0000000000000000000000000000000000000000");
    expect(isOver).to.be.false;
    expect(isStarted).to.be.false;
    expect(isWhitelistOnly).to.be.false;
  });
  it("Should be in whitelist after start epoch passed", async function() {
    await time.increase(time.duration.hours(3));
    await time.advanceBlock();
    const isOver = await rabbitRocket.isOver();
    const isStarted = await rabbitRocket.isStarted();
    const isWhitelistOnly = await rabbitRocket.isWhitelistOnly();
    expect(isOver).to.be.false;
    expect(isStarted).to.be.true;
    expect(isWhitelistOnly).to.be.true;
  });
  it("Should be not change the end epoch if timer reset in whitelist period", async function() {
    await rabbitRocket.timerReset(trader.address);
    const lastBuyer = await rabbitRocket.lastBuyer();
    const isOver = await rabbitRocket.isOver();
    const isStarted = await rabbitRocket.isStarted();
    const isWhitelistOnly = await rabbitRocket.isWhitelistOnly();
    expect(lastBuyer).to.eq(trader.address);
    expect(isOver).to.be.false;
    expect(isStarted).to.be.true;
    expect(isWhitelistOnly).to.be.true;
  });
  it("Should be in whitelist after whitelist end epoch passed", async function() {
    await time.increase(time.duration.days(1));
    await time.advanceBlock();
    const isOver = await rabbitRocket.isOver();
    const isStarted = await rabbitRocket.isStarted();
    const isWhitelistOnly = await rabbitRocket.isWhitelistOnly();
    expect(isOver).to.be.false;
    expect(isStarted).to.be.true;
    expect(isWhitelistOnly).to.be.false;
  });
  it("Should be increase end epoch", async function() {
    const currentTime = (await time.latest()).toNumber();
    await rabbitRocket.timerReset(trader1.address);
    const endEpoch = await rabbitRocket.endEpoch();

    const lastBuyer = await rabbitRocket.lastBuyer();
    const isOver = await rabbitRocket.isOver();
    const isStarted = await rabbitRocket.isStarted();
    const isWhitelistOnly = await rabbitRocket.isWhitelistOnly();

    expect(endEpoch).to.be.closeTo(currentTime+86400,10);
    expect(lastBuyer).to.eq(trader1.address);
    expect(isOver).to.be.false;
    expect(isStarted).to.be.true;
    expect(isWhitelistOnly).to.be.false;
  });
  it("Should be over after end epoch", async function() {
    await time.increase(time.duration.days(2));
    const isOver = await rabbitRocket.isOver();
    const isStarted = await rabbitRocket.isStarted();
    const isWhitelistOnly = await rabbitRocket.isWhitelistOnly();
    expect(isOver).to.be.true;
    expect(isStarted).to.be.true;
    expect(isWhitelistOnly).to.be.false;
  });
  //TODO: test sendRewards
});
