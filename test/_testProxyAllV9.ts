// This test is to test Identiy Manager V1 without Proxy
import { expect } from "chai";
import { ethers, upgrades } from "hardhat"
import { Contract, BigNumber } from "ethers"

describe("Apply proxy to IdentityManager Version 9 - new way", function () {
  let identityManagerNine:Contract;
  let identityManagerOrigin:Contract;
  // Object role code
  const USER        = 1;
  const OWNER       = 2;
  const ADMIN       = 3;
  const SYSTEM      = 4;
  // Multi-sign transaction code
  const AddTx       = 5;
  const DeactivTx   = 6;
  const ActivTx     = 7;
 
  beforeEach(async function () {
    const IdentityManager_Origin = await ethers.getContractFactory("IdentityManager");
    const IdentityManager_Nine = await ethers.getContractFactory("IdentityManager_Nine");
    // Deploy proxy
    identityManagerOrigin = await upgrades.deployProxy(IdentityManager_Origin, []);
    // *** Check proxy after deploying
    // console.log(identityManagerOrigin.address," Proxy Origin");
    // console.log(await upgrades.erc1967.getImplementationAddress(identityManagerOrigin.address)," ImplementationAddress Origin");
    // console.log(await upgrades.erc1967.getAdminAddress(identityManagerOrigin.address), " AdminAddress Origin");
    // Upgrade proxy
    identityManagerNine = await upgrades.upgradeProxy(identityManagerOrigin.address, IdentityManager_Nine);
    // *** Check proxy after upgrading
    // console.log(identityManagerOrigin.address," Proxy after upgrade");
    // console.log(await upgrades.erc1967.getImplementationAddress(identityManagerNine.address)," ImplementationAddress after upgrade");
    // console.log(await upgrades.erc1967.getAdminAddress(identityManagerNine.address), " AdminAddress after upgrade") ;  
    
    /* COMMENT THIS SEGMENT OF CODE TO TEST initializeSystem
      // Declare initial owners
      // const initialOwners = [
      //   "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      //   "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      //   "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      //   "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      //   "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"];
      // // Call inititalizeSystem function
      // await identityManagerNine.initializeSystem(initialOwners);
    */

  })
  it("should initilize system with at least 5 owners", async function () {
    const initialOwners = [
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"];
    const tx = await identityManagerNine.initializeSystem(initialOwners);
    expect(await identityManagerNine.initialized()).to.be.true;
    console.log("Check initialOwners.length",initialOwners.length);
    // Check if the owners were added successfully
    const owner1 = await identityManagerNine.objList_(initialOwners[0]);
    expect(owner1.isActive).to.be.true;
    const owner2 = await identityManagerNine.objList_(initialOwners[1]);
    expect(owner2.isActive).to.be.true;
    const owner3 = await identityManagerNine.objList_(initialOwners[2]);
    expect(owner3.isActive).to.be.true;
    const owner4 = await identityManagerNine.objList_(initialOwners[3]);
    expect(owner4.isActive).to.be.true;
    const owner5 = await identityManagerNine.objList_(initialOwners[4]);
    expect(owner5.isActive).to.be.true;
    const owner6 = await identityManagerNine.objList_(initialOwners[5]);
    expect(owner6.isActive).to.be.true;
    // Check if event emitted
    expect(tx).to.emit(identityManagerNine, "ownerAdded").withArgs(initialOwners[0]);
    const numSigReqMST = await identityManagerNine.numSigReqMST();
    expect(numSigReqMST).to.equal(4);
    // Check the value of initialized
    const initialized = await identityManagerNine.initialized();
    expect(initialized).to.be.true;
  });
})

/* TEST RESULT V9
==> succeed!!!
*/
