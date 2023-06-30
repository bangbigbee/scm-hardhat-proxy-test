// This test is to test Identiy Manager V1 without Proxy
import { expect } from "chai";
import { ethers } from "hardhat"
import { Contract, BigNumber } from "ethers"
import { Address } from "cluster";

describe("Test IdentityManager with basic functions ", function () {
  let identityManager:Contract;
  enum ObjType {USER, OWNER, ADMIN, SYSADDR}
  let owner: any;
  // Object role code
  const USER        = 1;
  const OWNER       = 2;
  const ADMIN       = 3;
  const SYSTEM      = 4;

  beforeEach(async function () {
    const IdentityManager = await ethers.getContractFactory("IdentityManager")
    identityManager = await IdentityManager.deploy() // Note: normal deployment
    await identityManager.deployed()
    
    const initialOwners = [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906"];
    await identityManager.initializeSystem(initialOwners);
    await identityManager.objList_(initialOwners[0]);
    await identityManager.objList_(initialOwners[1]);
    await identityManager.objList_(initialOwners[2]);
    await identityManager.objList_(initialOwners[3]);
  })
  // Test AddObject
    // ADD ADMIN
  it("should add new ADMIN", async function () {
    const signers = await ethers.getSigners();
    const adminAddr = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128";
    const role = ADMIN;
    const name = "Admin1";
    const idType = "CCCD";
    const idValue = "1239456AB32";
    const tx = await identityManager.connect(signers[0]).addObject(adminAddr, role, name, idType, idValue);
    // Check if the event was emitted
    expect(tx).to.emit(identityManager, "adminAdded").withArgs(signers[0].address, adminAddr);
    // Check if the admin was added successfully
    const adminobj = await identityManager.objList_(adminAddr);
    expect(adminobj.isActive).to.be.true;
    // Check if admin counter works
    const adminCounter = await identityManager.getActiveObjCounter(role);
    expect(adminCounter).to.equal(1);
    const objInfo = await identityManager.getObjectInfo(adminAddr);
    expect(objInfo[0]).to.equal(name);  
    expect(objInfo[1]).to.equal(idType);        
    expect(objInfo[2]).to.equal(idValue);        
  });
  // ADD SYSTEM ADDRESS
  it("should add new SYSTEM address", async function () {
    const signers = await ethers.getSigners();
    const systemAddr = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128";
    const role = SYSTEM;
    const name = "Router";
    const idType = "N/A";
    const idValue = "N/A";
    const tx = await identityManager.connect(signers[0]).addObject(systemAddr, role, name, idType, idValue);
    // Check if the event was emitted
    expect(tx).to.emit(identityManager, "systemAdded").withArgs(signers[0].address, systemAddr);
    // Check if the system address was added successfully
    const sys = await identityManager.objList_(systemAddr);
    expect(sys.isActive).to.be.true;
  });
  // ADD USER
  it("should fail if add a user", async function () {
  const signers = await ethers.getSigners();
  const userAddr = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128";
  const role = USER;
  const name = "User1";
  const idType = "GPLX";
  const idValue = "1239456A21B32";
  await expect(identityManager.connect(signers[0]).addObject(
    userAddr, role, name, idType, idValue)).to.be.revertedWith(
      "addObject: only for admin and system address");
  });
  // ADD OWNER
  it("should fail if add an owner", async function () {
  const signers = await ethers.getSigners();
  const ownerAddr = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128";
  const role = OWNER;
  const name = "Owner1";
  const idType = "CMND";
  const idValue = "1239456A21B32";
  await expect(identityManager.connect(signers[0]).addObject(
    ownerAddr, role, name, idType, idValue)).to.be.revertedWith(
      "addObject: only for admin and system address");
  });
  // Add an existing admin
  it("should fail if add an existing admin", async function () {
  const signers = await ethers.getSigners();
  const adminAddr = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128";
  const role = ADMIN;
  const name = "Admin1";
  const idType = "CCCD";
  const idValue = "1239456AB32";
  const tx = await identityManager.connect(signers[0]).addObject(adminAddr, role, name, idType, idValue);
  // Check if the event was emitted
  expect(tx).to.emit(identityManager, "adminAdded").withArgs(signers[0].address, adminAddr);
  // Check if the admin was added successfully
  const adminobj = await identityManager.objList_(adminAddr);
  expect(adminobj.isActive).to.be.true;
  // Add an existing admin
  await expect(identityManager.connect(signers[0]).addObject(
    adminAddr, role, name, idType, idValue)).to.be.revertedWith(
      "addObject: object already exists");
  });
  
  // Test activateObject
    // activate user
  it("should activate new USER", async function () {
     // First we register user via signers[6]
    const signers = await ethers.getSigners();
    const userAddr = signers[6].address;
    const role = USER;
    const name = "User 1";
    const idType = "CCCD";
    const idValue = "1239456AB32";
    const tx = await identityManager.connect(signers[6]).addUserWallet(name, idType, idValue);
    // Check if the event was emitted
    expect(tx).to.emit(identityManager, "userWalletAdded").withArgs(userAddr);
    // Check if the user wallet was added successfully
    const userObj = await identityManager.objList_(userAddr);
    expect(userObj.isActive).to.be.false;
    expect(userObj.role).to.equal(USER);
    // Check if user counter works on both total and active 
    const userTotalCounter = await identityManager.getTotalObjCounter(role);
    const userActiveCounter = await identityManager.getActiveObjCounter(role);
    expect(userTotalCounter).to.equal(1);
    expect(userActiveCounter).to.equal(0);
    // Then activate registered user
    await identityManager.connect(signers[0]).activateObject(userAddr);
    const acti = await identityManager.objList_(userAddr);
    expect(acti.isActive).to.equal(true);
    const userActivCounter_ = await identityManager.getActiveObjCounter(role);
    expect(userActivCounter_).to.equal(1);
    // Try to activate that address again
    await expect(identityManager.activateObject(userAddr)).to.be.revertedWith(
      "activateObject: object activated already");
    // Check if address is an owner
    const ownerAddr = signers[0].address;
    await expect(identityManager.activateObject(ownerAddr)).to.be.revertedWith(
      "activateObject: must be executed under MST");
    // Check with an address not existing
    const addr = signers[10].address;
    await expect(identityManager.activateObject(addr)).to.be.revertedWith(
      "activateObject: object does not exist");
  });


  // it("should update object information for a ADMIN object", async function () {
  //   const objAddr = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128"; 
  //   const objType = ObjType.ADMIN;
  //   const objId   = "AdminSuper1"; 
  //   const objIsKYC= true;
  //   const objInfo = await identityManager.updateObjectInfo(objAddr, objType, objId, objIsKYC );
  //   // Check if the event was emitted
  //   expect(objInfo).to.emit(identityManager, "adminUpdated").withArgs(owner.address, objAddr);
  //   // Check the returned object information
  //   const objInfoGet = await identityManager.getObjectInfo(objAddr, objType);
  //   expect(objInfoGet[0]).to.equal("AdminSuper1");  // objectId value
  //   expect(objInfoGet[1]).to.be.true;          // isActive value
  //   expect(objInfoGet[2]).to.be.true;         // isKYC value
  // });

})