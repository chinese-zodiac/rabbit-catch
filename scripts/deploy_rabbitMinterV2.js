
// set PRIVATE_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//npx hardhat run --network bscTestnet scripts/deploy_rabbitCachemaster.js


const hre = require("hardhat");

async function deployMaster(ethers){

  const [deployer] = await ethers.getSigners();

  const NFT_DEPLOYED_ADDR = "0x6Bf5843b39EB6D5d7ee38c0b789CcdE42FE396b4";

  console.log(`deploying rabbitminterv2 using account ${deployer.address}`);

  console.log('getting CZodiacNFT');
  const zodiacNFT = await ethers.getContractAt("CZodiacNFT", NFT_DEPLOYED_ADDR);


  console.log('deploying RabbitMinterV2');
  const RabbitMinterV2 = await ethers.getContractFactory("RabbitMinterV2");
  const rabbitMinterV2 = await RabbitMinterV2.deploy();
  await rabbitMinterV2.deployed();

  console.log(`rabbitMinterV2 deployed at ${rabbitMinterV2.address}`);

  const tx1 = await zodiacNFT.addMinter(rabbitMinterV2.address);
  await tx1.wait();

  console.log('all deployed');
  console.log("rabbitMinterV2",rabbitMinterV2.address);

  return {rabbitMinterV2, zodiacNFT};

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
