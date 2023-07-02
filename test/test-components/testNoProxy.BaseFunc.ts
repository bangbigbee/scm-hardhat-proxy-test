// This test is to test Identiy Manager V1 without Proxy
import { expect } from "chai";
import { ethers } from "hardhat"
import { Contract, BigNumber } from "ethers"
import { Address } from "cluster";

describe("Test IdentityManager with basic functions ", function () {
  let identityManager:Contract;
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
      "activateObject: must be executed with MST");
    // Check with an address not existing
    const addr = signers[10].address;
    await expect(identityManager.activateObject(addr)).to.be.revertedWith(
      "activateObject: object does not exist");
  });

  // Test deactivateObject
    // deactivate user
    it("should deactivate user", async function () {
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
     // Then deactivate user
     await identityManager.connect(signers[1]).deactivateObject(userAddr);
     const obj = await identityManager.objList_(userAddr);
     expect(obj.isActive).to.be.false;
    // Deactive one more time
     await expect(identityManager.deactivateObject(userAddr)).to.be.revertedWith(
                 "deactivateObject: object already deactivated");
    // Check if deactivate an owner
    const ownerAddr = signers[0].address;
    await expect(identityManager.deactivateObject(ownerAddr)).to.be.revertedWith(
      "deactivateObject: for owner, must be executed with MST");
    // Check with an address not existing
    const addr = signers[10].address;
    await expect(identityManager.deactivateObject(addr)).to.be.revertedWith(
      "deactivateObject: object does not exist");
    });
    // Deactivate an admin
      //First add an admin
    it("should deactivate an admin", async function () {
    const signers = await ethers.getSigners();
    const adminAddr_ = signers[7].address;
     const role_ = ADMIN;
     const name_ = "Admin 1";
     const idType_ = "CMND";
     const idValue_ = "1239413256AB32";
    const txAdmin = await identityManager.connect(signers[0]).addObject(adminAddr_, role_, name_, idType_, idValue_);
    // Check if the event was emitted
    expect(txAdmin).to.emit(identityManager, "adminAdded").withArgs(adminAddr_);
    // Check if the admin was added successfully
    const adminObj = await identityManager.objList_(adminAddr_);
    expect(adminObj.isActive).to.be.true;
    expect(adminObj.role).to.equal(ADMIN);
    // Then deactivate admin
    await identityManager.connect(signers[1]).deactivateObject(adminAddr_);
    const adminObj_ = await identityManager.objList_(adminAddr_);
    expect(adminObj_.isActive).to.be.false;
     });
    it("should deactivate a system address", async function () {
    const signers = await ethers.getSigners();
    const systemAddr_ = signers[8].address;
    const role_ = SYSTEM;
    const name_ = "Router";
    const idType_ = "N/a";
    const idValue_ = "N/a";
    const txSys = await identityManager.connect(signers[0]).addObject(systemAddr_, role_, name_, idType_, idValue_);
    // Check if the event was emitted
    expect(txSys).to.emit(identityManager, "systemAdded").withArgs(systemAddr_);
    // Check if system address was added successfully
    const sysTx_ = await identityManager.objList_(systemAddr_);
    expect(sysTx_.isActive).to.be.true;
    expect(sysTx_.role).to.equal(SYSTEM);
    // Then deactivate system address
    await identityManager.connect(signers[1]).deactivateObject(systemAddr_);
    const sysTx = await identityManager.objList_(systemAddr_);
    expect(sysTx.isActive).to.be.false;
      });
    //Deactivate an owner    
    it("should fail if deactivate an owner", async function () {
    const signers = await ethers.getSigners();
    const ownerAddr_ = signers[2].address;
    // Then try deactivate owner without MST
    await expect(identityManager.deactivateObject(ownerAddr_)).to.be.revertedWith(
        "deactivateObject: for owner, must be executed with MST");
      });
  // Test updateObject
  it("should update user information successuly ", async function () {
    const signers = await ethers.getSigners();
    // First we add a user wallet
    await identityManager.connect(signers[5]).addUserWallet("NguyenTriBang", "GPLX", "gplx12344");
    const getInfoTx = await identityManager.connect(signers[0]).objList_(signers[5].address);
    expect(getInfoTx.name).to.equal("NguyenTriBang");
    expect(getInfoTx.idType).to.equal("GPLX");
    expect(getInfoTx.idValue).to.equal("gplx12344");
    expect(getInfoTx.role).to.equal(USER);
    // Then update user info
    const userAddr = signers[5].address;
    const role_ = USER;
    const name_ = "Nguyen Tri Bang";
    const idType_ = "CCCD";
    const idValue_ = "1234asdq23s";
    const isKYC_ = true;    
    const userTx_ = await identityManager.connect(signers[0]).updateObjectInfo(userAddr, name_, idType_, idValue_, isKYC_);
    // Check if the event was emitted
    expect(userTx_).to.emit(identityManager, "userUpdated").withArgs(signers[0].address, userAddr);
    const updateTx = await identityManager.connect(signers[0]).objList_(signers[5].address);
    expect(updateTx.name).to.equal("Nguyen Tri Bang");
    expect(updateTx.idType).to.equal("CCCD");
    expect(updateTx.idValue).to.equal("1234asdq23s");
    expect(updateTx.role).to.equal(USER);
    expect(updateTx.isKYC).to.equal(true);
  });
  it("should update owner information successuly ", async function () {
    const signers = await ethers.getSigners();
    // Update user info
    const ownerAddr = signers[1].address;
    const name_ = "Tran Quoc Viet";
    const idType_ = "GPLX";
    const idValue_ = "1234123Gs";
    const isKYC_ = true;    
    // Check the role of caller if a user
    await expect(identityManager.connect(signers[5]).updateObjectInfo(ownerAddr, name_, idType_, idValue_, isKYC_)).to.be.revertedWith(
      "Not authorized as admin!");
    const ownerTx_ = await identityManager.connect(signers[0]).updateObjectInfo(ownerAddr, name_, idType_, idValue_, isKYC_);
    // Check if the event was emitted
    expect(ownerTx_).to.emit(identityManager, "ownerUpdated").withArgs(signers[0].address, ownerAddr);
    const updateTx = await identityManager.connect(signers[0]).objList_(signers[1].address);
    expect(updateTx.name).to.equal("Tran Quoc Viet");
    expect(updateTx.idType).to.equal("GPLX");
    expect(updateTx.idValue).to.equal("1234123Gs");
    expect(updateTx.role).to.equal(OWNER);
    expect(updateTx.isKYC).to.equal(isKYC_);
  });
})