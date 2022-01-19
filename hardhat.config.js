require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage")

const loadJsonFile = require("load-json-file");
const networkConfig = loadJsonFile.sync("./networkConfig.json");


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          }
        }
      }
    ],
  },
  mocha: {
    timeout: 5000000,
  },
  networks: {
    bscTestnet: {
      url: `https://data-seed-prebsc-1-s2.binance.org:8545`,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [networkConfig.ethKey],
      gasMultiplier: 1.2,
    },
    bsc: {
      url: `https://bscrpc.com`,
      accounts: [networkConfig.ethKey],
      gasMultiplier: 1,
    }
  },
  etherscan: {
    apiKey: {
      bsc: process.env.ETHERSCAN_KEY !== undefined ? process.env.ETHERSCAN_KEY : networkConfig.etherscanKey
    }
  }
  
  /*,
  networks: {
    hardhat: {
      forking: {
        url: `https://speedy-nodes-nyc.moralis.io/${networkConfig.moralisRpcKey}/bsc/mainnet/archive`,
        blockNumber:  12700000
      }
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${networkConfig.rpcKey}`,
      accounts: [networkConfig.ethKey],
      gasMultiplier: 1.2,
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${networkConfig.rpcKey}`,
      accounts: [networkConfig.ethKey],
      gasMultiplier: 1.2,
    },
    xdai: {
      url: `https://rpc.xdaichain.com`,
      accounts: [networkConfig.ethKey],
      gasMultiplier: 1.2,
    },
    matic: {
      url: `https://rpc-mainnet.maticvigil.com`,
      accounts: [networkConfig.ethKey],
      gasMultiplier: 1.2,
    },
    bsc: {
      url: `https://bscrpc.com`,
      accounts: [networkConfig.ethKey],
      gasMultiplier: 1,
    },
    bscTestnet: {
      url: `https://data-seed-prebsc-1-s2.binance.org:8545`,
      accounts: [networkConfig.ethKey],
      gasMultiplier: 1.2,
    }
    
  },
  etherscan: {
    apiKey: networkConfig.etherscanKey
  }
  */
};

