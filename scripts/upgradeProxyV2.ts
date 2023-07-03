import { ethers } from "hardhat";
import { upgrades } from "hardhat";

async function main() {
const IdentityManager_Origin = await ethers.getContractFactory("IdentityManager");
const identityManagerOrigin = await upgrades.deployProxy(IdentityManager_Origin, []);

const proxyAddress = identityManagerOrigin.address;
console.log(proxyAddress," IdentityManagerOrigin proxy address")

const IdentityManger_Two = await ethers.getContractFactory("IdentityManager_Two")
console.log("Upgrading to IdentityManger_Two...")
const identityManagerTwo = await upgrades.upgradeProxy(proxyAddress, IdentityManger_Two)
console.log(identityManagerTwo.address," IdentityManger_Two proxy address (should be the same)")

console.log(await upgrades.erc1967.getImplementationAddress(identityManagerTwo.address)," getImplementationAddress")
console.log(await upgrades.erc1967.getAdminAddress(identityManagerTwo.address), " getAdminAddress")    
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})