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

describe("RabbitCreed", function () {
  let owner, trader, trader1, trader2, trader3;
  let deployer;
  let rabbitCreed;
  let rabbitRocket;
  const CODE1 = "CODE1";
  const CODE2 = "CODE2";
  const CODE3 = "CODE3";
  before(async function() {
    [owner, trader, trader1, trader2, trader3] = await ethers.getSigners();

    const RabbitRocket = await ethers.getContractFactory("RabbitRocket");
    const startTime = (await time.latest()).toNumber();
    rabbitRocket = await RabbitRocket.deploy(
      startTime + 3600,//uint32 _startEpoch,
      startTime + 3600 + 86400,//uint32 _whitelistEndEpoch,
      86400//uint32 _countdownSeconds
    );

    const RabbitCreed = await ethers.getContractFactory("RabbitCreed");
    rabbitCreed = await RabbitCreed.deploy();

  });
  it("Should register code", async function () {
    await rabbitCreed.connect(trader1).register(CODE1);
    const isCodeRegistered = await rabbitCreed.isCodeRegistered(CODE1);
    const account = await rabbitCreed.codeToAccount(CODE1);
    const code = await rabbitCreed.accountToCode(trader1.address);
    const isValidNewCode = await rabbitCreed.isValidNewCode(CODE1);
    expect(isCodeRegistered).to.be.true;
    expect(account).to.eq(trader1.address);
    expect(code).to.eq(CODE1);
    expect(isValidNewCode).to.be.false;
  })
  it("Should accept BNB rewards to account for code", async function () {
    await rabbitCreed.addRewards(CODE1,{value:parseEther("1")});
    const payments = await rabbitCreed.payments(trader1.address);
    expect(payments).to.eq(parseEther("1"));
  });
  it("Should revert duplicate code", async function () {
    expect(rabbitCreed.connect(trader2).register(CODE1)).to.be.revertedWith("RabbitCreed: Not valid new code");    
  });
  it("Should revert unregistered code", async function () {
    expect(rabbitCreed.addRewards(CODE2,{value:parseEther("1")})).to.be.revertedWith("RabbitCreed: Code not registered");    
  });
  it("Should unregister code", async function () {
    await rabbitCreed.connect(trader1).unregister();
    const isCodeRegistered = await rabbitCreed.isCodeRegistered(CODE1);
    const account = await rabbitCreed.codeToAccount(CODE1);
    const code = await rabbitCreed.accountToCode(trader1.address);
    const isValidNewCode = await rabbitCreed.isValidNewCode(CODE1);
    expect(isCodeRegistered).to.be.false;
    expect(account).to.eq(ethers.constants.AddressZero);
    console.log("code",code);
    expect(code).to.eq("");
    expect(isValidNewCode).to.be.true;
  })
});
