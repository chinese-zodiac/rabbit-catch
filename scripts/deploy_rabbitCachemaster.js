
// set PRIVATE_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//npx hardhat run --network bscTestnet scripts/deploy_rabbitCachemaster.js


const hre = require("hardhat");

async function deployMaster(ethers){

  const [deployer] = await ethers.getSigners();

  console.log(`deploying RabbitRocket using account ${deployer.address}`);

  const RabbitRocketfactory = await ethers.getContractFactory("RabbitRocket");

  const secondsSinceEpoch = Math.round(Date.now() / 1000);

  //const startTime = (await time.latest()).toNumber();

  const rabbitRocket = await RabbitRocketfactory.deploy(
      secondsSinceEpoch,//uint32 _startEpoch,
      secondsSinceEpoch  + (86400 * 7), //God for 7 days uint32 _whitelistEndEpoch,
      86400 * 7//uint32 _countdownSeconds
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
  const zodiacNFT = await CZodiacNFTfactory.deploy();
  await zodiacNFT.deployed();


  console.log('deploying CatchMaster');
  const RabbitCatchMasterfactory = await ethers.getContractFactory("RabbitCatchMaster");
  const rabbitCatchMaster = await RabbitCatchMasterfactory.deploy(
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

  return {rabbitCatchMaster, rabbitRocket, zodiacNFT};

}



async function main() {
  await deployMaster(hre.ethers);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
