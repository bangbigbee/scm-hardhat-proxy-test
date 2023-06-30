// This test is to test Identiy Manager V1 without Proxy
import { expect } from "chai";
import { ethers } from "hardhat"
import { Contract, BigNumber } from "ethers"

describe("Testing IdentityManager @InitializeSytem...", function () {
  let identityManager:Contract;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const IdentityManager = await ethers.getContractFactory("IdentityManager")
    identityManager = await IdentityManager.deploy() // Note: normal deployment
    await identityManager.deployed()
    console.log("Deployed at: ",identityManager.address);

  })
  it("should initilize system with 3 owners", async function () {
    const initialOwners = [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"];
    const tx = await identityManager.initializeSystem(initialOwners);
    // Check if the owners were added successfully
    const owner1 = await identityManager.objList_(initialOwners[0]);
    expect(owner1.isActive).to.be.true;
    const owner2 = await identityManager.objList_(initialOwners[1]);
    expect(owner2.isActive).to.be.true;
    const owner3 = await identityManager.objList_(initialOwners[2]);
    expect(owner3.isActive).to.be.true;

    // Check if the event was emitted
    expect(tx).to.emit(identityManager, "ownerAdded").withArgs("0x0000000000000000000000000000000000000000", initialOwners[0]);

    // Check the value of numSigReqMST
    const numSigReqMST = await identityManager.numSigReqMST();
    expect(numSigReqMST).to.equal(2);
    // Check the value of initialized
    const initialized = await identityManager.initialized();
    expect(initialized).to.be.true;
  });

  it("should fail if less than 3 owners are provided", async function () {
    const initialOwners = [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    ];
    await expect(identityManager.initializeSystem(initialOwners)).to.be.revertedWith("Required at least 3 owners to initialize system");
  });
})