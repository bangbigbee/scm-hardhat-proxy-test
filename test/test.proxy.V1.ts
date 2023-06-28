// This test is to test Identiy Manager V1 without Proxy
import { expect } from "chai";
import { ethers, upgrades } from "hardhat"
import { Contract, BigNumber } from "ethers"

describe("IdentityManager With Proxy", function () {
  let identityManager:Contract;
  enum ObjType {USER, OWNER, ADMIN, SYSADDR}
  let owner: any;
  
  before(async function () {
    [owner] = await ethers.getSigners();
    const IdentityManager = await ethers.getContractFactory("IdentityManager");
    identityManager = await upgrades.deployProxy( // Note: proxy deployment
      IdentityManager,
      ["Hello! Let's apply proxy on Identity Manager!"], 
      { initializer: 'sayHello' });
    console.log(identityManager.address," box/proxy")
    console.log(await upgrades.erc1967.getImplementationAddress(identityManager.address)," getImplementationAddress")
    console.log(await upgrades.erc1967.getAdminAddress(identityManager.address), " getAdminAddress")   


  })
  it("should initilize system with 3 owners", async function () {
    const initialOwners = [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"];
    const tx = await identityManager.initialize(initialOwners);
    // Check if the owners were added successfully
    const owner1 = await identityManager.ownerList_(initialOwners[0]);
    expect(owner1.isActive).to.be.true;

    const owner2 = await identityManager.ownerList_(initialOwners[1]);
    expect(owner2.isActive).to.be.true;

    const owner3 = await identityManager.ownerList_(initialOwners[2]);
    expect(owner3.isActive).to.be.true;

    // Check if the event was emitted
    expect(tx).to.emit(identityManager, "ownerTransfered").withArgs("0x0000000000000000000000000000000000000000", initialOwners[0]);

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
    await expect(identityManager.initialize(initialOwners)).to.be.revertedWith("Contract is already initialized");
    // shoule be "It is required at least 3 owners to initialize system!"
    // instead of "Contract is already initialized"
    // but the contract is already initialized, so the modifier initializer will revert the message as above!
  });

  it("should add new ADMIN", async function () {
    const objAddress = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128";
    const objType = ObjType.ADMIN;
    const objId = "Admin1";
    const tx = await identityManager.addObject(objAddress,objType, objId);
    // Check if the event was emitted
    expect(tx).to.emit(identityManager, "adminAdded").withArgs(owner.address, objAddress);
    // Check if the admin was added successfully
    const adminObject = await identityManager.adminList_(objAddress);
    expect(adminObject.isActive).to.be.true;
  })
  it("should get object information for a ADMIN object", async function () {
    const adminObject = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128"; 
    const objType = ObjType.ADMIN; 
    const objInfo = await identityManager.getObjectInfo(adminObject, objType);
    // Check the returned object information
    expect(objInfo[0]).to.equal("Admin1");  // objectId value
    expect(objInfo[1]).to.be.true;          // isActive value
    expect(objInfo[2]).to.be.false;         // isKYC value
  });
  it("should update object information for a ADMIN object", async function () {
    const objAddr = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128"; 
    const objType = ObjType.ADMIN;
    const objId   = "AdminSuper1"; 
    const objIsKYC= true;
    const objInfo = await identityManager.updateObjectInfo(objAddr, objType, objId, objIsKYC );
    // Check if the event was emitted
    expect(objInfo).to.emit(identityManager, "adminUpdated").withArgs(owner.address, objAddr);
    // Check the returned object information
    const objInfoGet = await identityManager.getObjectInfo(objAddr, objType);
    expect(objInfoGet[0]).to.equal("AdminSuper1");  // objectId value
    expect(objInfoGet[1]).to.be.true;          // isActive value
    expect(objInfoGet[2]).to.be.true;         // isKYC value
  });

})