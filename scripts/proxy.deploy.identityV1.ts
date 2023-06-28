// scripts/deploy.js
import { ethers } from "hardhat"
import { upgrades } from "hardhat"

async function main() {

  const IdentityManager = await ethers.getContractFactory("IdentityManager")
  // const identity = await IdentityManager.deploy();
  const proxy = await upgrades.deployProxy(IdentityManager,[
    ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"]], { initializer: 'initialize' })
  console.log(proxy.address," proxy address")
  console.log(await upgrades.erc1967.getImplementationAddress(proxy.address)," getImplementationAddress")
  console.log(await upgrades.erc1967.getAdminAddress(proxy.address)," getAdminAddress")    
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
