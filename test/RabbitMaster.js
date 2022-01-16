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
const { Contract } = require('ethers');

const { parseEther } = ethers.utils;

let rabbitCatchMaster;
let rabbitRocket;
let zodiacNFT;

describe.only("RabbitCacheMaster", function () {

    it("Should should deploy", async function () {
        const [deployer, addr1] = await ethers.getSigners();


        console.log('deploying RabbitRocket');

        const RabbitRocketfactory = await ethers.getContractFactory("RabbitRocket");
        const startTime = (await time.latest()).toNumber();

        rabbitRocket = await RabbitRocketfactory.deploy(
            startTime + 3600,//uint32 _startEpoch,
            startTime + 3600 + 86400,//uint32 _whitelistEndEpoch,
            86400//uint32 _countdownSeconds
        );

        await rabbitRocket.deployed();

        const masterRole = await rabbitRocket.MASTER_ROLE();
        console.log(`masterRole = ${masterRole}`);

        console.log('deploying RabbitCreed');
        const RabbitCreedfactory = await ethers.getContractFactory("RabbitCreed");
        const rabbitCreed = await RabbitCreedfactory.deploy();
        await rabbitCreed.deployed();


        console.log('deploying RabbitGreed');
        const RabbitGreedfactory = await ethers.getContractFactory("RabbitGreed");
        const rabbitGreed = await RabbitGreedfactory.deploy(rabbitRocket.address);
        await rabbitGreed.deployed();
          
        console.log('deploying RabbitFancier');
        const RabbitFancierfactory = await ethers.getContractFactory("RabbitFancier");
        const rabbitFancier = await RabbitFancierfactory.deploy(rabbitRocket.address);
        await rabbitFancier.deployed();

        console.log('deploying RabbitBreed');
        const RabbitBreedfactory = await ethers.getContractFactory("RabbitBreed");
        const rabbitBreed = await RabbitBreedfactory.deploy(rabbitRocket.address);
        await rabbitBreed.deployed();

        console.log('deploying CZodiacNFT');
        const CZodiacNFTfactory = await ethers.getContractFactory("CZodiacNFT");
        zodiacNFT = await CZodiacNFTfactory.deploy();
        await zodiacNFT.deployed();


        console.log('deploying CatchMaster');
        const RabbitCatchMasterfactory = await ethers.getContractFactory("RabbitCatchMaster");
        rabbitCatchMaster = await RabbitCatchMasterfactory.deploy(
            rabbitRocket.address,
            rabbitCreed.address,
            rabbitGreed.address,
            rabbitFancier.address,
            rabbitBreed.address,
            zodiacNFT.address
        );
        await rabbitCatchMaster.deployed();

        console.log(`rabbitCatchMaster deployed at ${rabbitCatchMaster.address}`);

        const tx1 = await zodiacNFT.addMinter(rabbitCatchMaster.address);
        await tx1.wait();

        const tx2 = await rabbitRocket.grantRole(masterRole,rabbitCatchMaster.address);
        await tx2.wait();

        const tx3 = await rabbitGreed.grantRole(masterRole,rabbitCatchMaster.address);
        await tx3.wait();

        console.log('all deployed');
    });

    it("Should mint", async function () {

        const [deployer, addr1] = await ethers.getSigners();

        console.log(`deployer = ${deployer.address}`);
        console.log(`addr1 = ${addr1.address}`);

        let price = await rabbitCatchMaster.getPrice();
        let priceEth = ethers.utils.formatEther(price);
        console.log(`price is ${priceEth}`);
        expect(priceEth).to.be.eq("0.1");


        let onWhiteList = await rabbitCatchMaster.whitelist(addr1.address);
        console.log(`onWhiteList is ${onWhiteList}`);
        expect(onWhiteList).to.be.eq(false);

        const tx1 = await rabbitCatchMaster.updateWhitelist(addr1.address, true);
        await tx1.wait();
        onWhiteList = await rabbitCatchMaster.whitelist(addr1.address);
        console.log(`afer update onWhiteList is ${onWhiteList}`);
        expect(onWhiteList).to.be.eq(true);


        const canMintBeforeStart = await rabbitCatchMaster.canMint(addr1.address);
        console.log(`canMint is ${canMintBeforeStart} before startEpoch`);
        expect(canMintBeforeStart).to.be.false;
        await expect(rabbitCatchMaster.connect(addr1).mint(addr1.address,'',{
            value:ethers.utils.parseEther(priceEth.toString())
        })).to.be.revertedWith("RabbitCatchMaster: Cannot Mint");

        //Increase time past start epoch
        await time.increase(time.duration.hours(2));

        let tokenbalance = await zodiacNFT.balanceOf(addr1.address);
        console.log(`tokenbalance is ${tokenbalance}`);
        expect(tokenbalance).to.be.eq(0);

        const canMintAfterStart = await rabbitCatchMaster.canMint(addr1.address);
        console.log(`canMint is ${canMintAfterStart} after startEpoch`);
        expect(canMintAfterStart).to.be.true;

        const tx2 = await rabbitCatchMaster.connect(addr1).mint(addr1.address,'',{
            value:ethers.utils.parseEther(priceEth.toString())
        });
        await tx2.wait();

        price = await rabbitCatchMaster.getPrice();
        priceEth = ethers.utils.formatEther(price);
        console.log(`price after first mint is ${priceEth}`);

        const tx3 = await rabbitCatchMaster.connect(addr1).mint(addr1.address,'',{
            value:ethers.utils.parseEther(priceEth.toString())
        });
        await tx3.wait();

        tokenbalance = await zodiacNFT.balanceOf(addr1.address);
        expect(tokenbalance).to.be.eq(2);

        for(let i=0;i<tokenbalance;i++){
            const tokenId = await zodiacNFT.tokenOfOwnerByIndex(addr1.address,i);
            console.log(`owned tokenid = ${tokenId}`);
        }        
    });

    
    it("Should stop at 2500 mints", async function () {
        const [deployer, addr1] = await ethers.getSigners();

        //Increase time past whitelist epoch
        await time.increase(time.duration.days(1));

        const mintCountInitial = await rabbitCatchMaster.mintCount();
        const canMintBeforeMax = await rabbitCatchMaster.canMint(addr1.address);
        expect(canMintBeforeMax).to.be.true;
        console.log("testing 2500 mint cap. please wait...")
        for(let i=0;i<2500-mintCountInitial;i++){ 
            if((i+mintCountInitial.toNumber())%250==0) console.log(`${i+mintCountInitial.toNumber()} mints...`);
            price = await rabbitCatchMaster.getPrice();
            await rabbitCatchMaster.connect(addr1).mint(addr1.address,'',{
                value:price
            });
        }
        console.log("2500 mints success.")
        const mintCountFinal = await rabbitCatchMaster.mintCount();
        const canMintAfterMax = await rabbitCatchMaster.canMint(addr1.address);
        const tokenbalance = await zodiacNFT.balanceOf(addr1.address);
        expect(tokenbalance).to.be.eq(2500);
        expect(canMintAfterMax).to.be.false;
        expect(mintCountFinal).to.eq(2500);
    });


});

async function printStatus(){
    const mintCount = await rabbitCatchMaster.mintCount();
    const mintCountMax = await rabbitCatchMaster.mintCountMax();
    const isOver = await rabbitRocket.isOver();

    //rabbitCatchMaster.white

}