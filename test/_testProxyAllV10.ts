// This test is to test Identiy Manager V1 without Proxy
import { expect } from "chai";
import { ethers, upgrades } from "hardhat"
import { Contract, BigNumber } from "ethers"

describe("Apply proxy to IdentityManager Version 10 - new way", function () {
  let identityManagerTen:Contract;
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
    const IdentityManager_Ten = await ethers.getContractFactory("IdentityManager_Ten");
    // Deploy proxy
    identityManagerOrigin = await upgrades.deployProxy(IdentityManager_Origin, []);
    // *** Check proxy after deploying
    // console.log(identityManagerOrigin.address," Proxy Origin");
    // console.log(await upgrades.erc1967.getImplementationAddress(identityManagerOrigin.address)," ImplementationAddress Origin");
    // console.log(await upgrades.erc1967.getAdminAddress(identityManagerOrigin.address), " AdminAddress Origin");
    // Upgrade proxy
    identityManagerTen = await upgrades.upgradeProxy(identityManagerOrigin.address, IdentityManager_Ten);
    // *** Check proxy after upgrading
    // console.log(identityManagerOrigin.address," Proxy after upgrade");
    // console.log(await upgrades.erc1967.getImplementationAddress(identityManagerTen.address)," ImplementationAddress after upgrade");
    // console.log(await upgrades.erc1967.getAdminAddress(identityManagerTen.address), " AdminAddress after upgrade") ;  
    // Declare initial owners
    const initialOwners = [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906"];
    // Call inititalizeSystem function
    await identityManagerTen.initializeSystem(initialOwners);
  })
// =================TESTING MST =====================
// ADD an OWNER with MST
  it("should submit >> sign >> execute ADD OWNER with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = AddTx; 
    const role = OWNER;
    const addr = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
  // Submit ADD OWNER
    const signer0 = await identityManagerTen.connect(signers[0]).submitMST(txCode, role, addr);
    const txIdAdd = identityManagerTen.getMSTCounter();
    // Check if the event was emitted
    expect(signer0).to.emit(identityManagerTen, "mstSubmitted").withArgs(signer0.address, txIdAdd);
    // Check the returned object information
    let mstInfo = await identityManagerTen.getMSTInfo(txIdAdd);
    expect(mstInfo[0]).to.equal(AddTx); 
    expect(mstInfo[1]).to.equal(OWNER);
    expect(mstInfo[2]).to.equal("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199");
    expect(mstInfo[5]).to.be.false; // isExecuted
    expect(mstInfo[6]).to.equal(0); // signature counter

  // Sign a submitted ADD OWNER MST
    const signObj = await identityManagerTen.connect(signers[0]).signSubmittedMST(txIdAdd);
    // Check if the MST was signed
    expect(signObj).to.emit(
      identityManagerTen, "MSTSigned").withArgs(signers[0].address, txIdAdd);
    // Check the number of signatures
    mstInfo = await identityManagerTen.getMSTInfo(txIdAdd);
    expect(mstInfo[6]).to.equal(1);

  // Execute a MST ADD OWNER - WHEN NOT ENOUGH REQUIRED SIGNATURES
    await expect(identityManagerTen.connect(signers[0]).executeMST(txIdAdd)).to.be.revertedWith(
      "Not enough signatures to execute transaction");
    mstInfo = await identityManagerTen.getMSTInfo(txIdAdd);
    expect(mstInfo[5]).to.be.false; // isExecuted
    // get more signatures 
    await identityManagerTen.connect(signers[1]).signSubmittedMST(txIdAdd);
    await identityManagerTen.connect(signers[2]).signSubmittedMST(txIdAdd);
    await identityManagerTen.connect(signers[3]).signSubmittedMST(txIdAdd);    
    await identityManagerTen.connect(signers[0]).executeMST(txIdAdd);
    // expect(result).to.equal(true);
    // check if the transaction was successfully executed
    mstInfo = await identityManagerTen.getMSTInfo(txIdAdd);
    expect(mstInfo[5]).to.equal(true);
    expect(mstInfo[6]).to.equal(4);
    // check if the event was emitted
    expect(identityManagerTen).to.emit(
      identityManagerTen, "MSTExecuted").withArgs(signers[0].address, txIdAdd);
  });

// ADD a USER with MST
  it("should not accept ADD USER with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = AddTx; 
    const role = USER;
    const addr = "0x60Dc2c9dd7bF5a5D2593D01B01206a7be9a0077F";
    await expect(identityManagerTen.submitMST(txCode, role, addr)).to.be.revertedWith(
      "signSubmittedMST: No need MST to add user");
  });
  // Test ADD a SYSTEM with MST
  it("should not accept ADD SYSTEM with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = AddTx; 
    const role = SYSTEM
    const addr = "0x60Dc2c9dd7bF5a5D2593D01B01206a7be9a0077F";
    await expect(identityManagerTen.submitMST(txCode, role, addr)).to.be.revertedWith(
      "signSubmittedMST: No need MST to add system address");
  });
    // Test ADD ADMIN with MST
    it("should not accept ADD ADMIN with multi-sign transaction", async function () {
      const signers = await ethers.getSigners();
      const txCode = AddTx; 
      const role = ADMIN
      const addr = "0x60Dc2c9dd7bF5a5D2593D01B01206a7be9a0077F";
      await expect(identityManagerTen.submitMST(txCode, role, addr)).to.be.revertedWith(
        "signSubmittedMST: No need MST to add admin");
    });
  
    // Test ACTIVATE USER with MST
  it("should submit >> sign >> execute ACTIVATE USER with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    
  // First we test register user with signer[5] 
    await identityManagerTen.connect(signers[5]).addUserWallet("User5", "CCCD", "12345asd2");
  // Check if event emitted
    expect(identityManagerTen).to.emit(
    identityManagerTen, "userWalletAdded").withArgs(signers[5].address);
  // Check if user registered successfully
    const objInfo =  await identityManagerTen.objList_(signers[5].address);
    expect(objInfo.name).to.equal("User5");
    expect(objInfo.isActive).to.equal(false);

  // Submit an ACTI USER with MST  
    const txCode = ActivTx; 
    const role = USER
    const addr = signers[5].address;
    await identityManagerTen.connect(signers[0]).submitMST(txCode, role, addr)
    const txIdActi = identityManagerTen.getMSTCounter();
    // Check if event emitted
    expect(identityManagerTen).to.emit(
    identityManagerTen, "MSTSubmitted").withArgs(signers[0].address, txIdActi);
    // Get MST info
    const mstInfo = await identityManagerTen.getMSTInfo(identityManagerTen.getMSTCounter());
    // Check if MST has been successully submitted
    expect(mstInfo.txCode).to.equal(ActivTx);
    expect(mstInfo.role).to.equal(USER);

  // Meanwhile, submit DEACTIVE USER with MST  
    const txCodeDeact = DeactivTx; 
    const roleDeact = USER
    const addrDeact = signers[5].address;
    await identityManagerTen.connect(signers[1]).submitMST(txCodeDeact, roleDeact, addrDeact)
    const txIdDeact = identityManagerTen.getMSTCounter(); // save the txId of DEACTI USER of signers[5].address
    // Check if event emitted
    expect(identityManagerTen).to.emit(
    identityManagerTen, "MSTSubmitted").withArgs(signers[1].address, txIdDeact);
    // Get MST info
    const mstDeact = await identityManagerTen.getMSTInfo(txIdDeact);
    // Check if MST has been successully submitted
    expect(mstDeact[0]).to.equal(txCodeDeact);
    expect(mstDeact[1]).to.equal(roleDeact);
    // Check length of MSTList_
    expect(await identityManagerTen.getMSTCounter()).to.equal(2);
  
    // Now we have 2 MST, but we sign ACTI USER fist 
    const signObj = await identityManagerTen.connect(signers[0]).signSubmittedMST(txIdActi);
    // Check if the MST was signed
    expect(signObj).to.emit(
      identityManagerTen, "MSTSigned").withArgs(signers[0].address, txIdActi);
    // Check the number of signatures
    const mstActiInfo = await identityManagerTen.getMSTInfo(txIdActi);
    expect(mstActiInfo[6]).to.equal(1);

  // Execute a MST ACTIVATE USER - when not enough signatures
    await expect(identityManagerTen.connect(signers[0]).executeMST(txIdActi)).to.be.revertedWith(
      "Not enough signatures to execute transaction");
    const mstActiInfo_ = await identityManagerTen.getMSTInfo(txIdActi);
    expect(mstActiInfo_[5]).to.be.false; // isExecuted is expected to be false
    
    // let's get more signatures 
    await identityManagerTen.connect(signers[1]).signSubmittedMST(txIdActi);
    await identityManagerTen.connect(signers[2]).signSubmittedMST(txIdActi); 
    // let an owner sign existing transaction one more time
    await expect(identityManagerTen.connect(signers[1]).signSubmittedMST(txIdActi)).to.be.revertedWith(
      "Already signed")
     // Execute a MST ACTIVATE USER - WHEN ENOUGH REQUIRED SIGNATURES 
    await identityManagerTen.connect(signers[0]).executeMST(txIdActi);
    // check if the transaction was successfully executed
    const mstInfoExe = await identityManagerTen.getMSTInfo(txIdActi);
    expect(mstInfoExe[5]).to.equal(true); // isExecuted to be true
    expect(mstInfoExe[6]).to.equal(3); // got 3 signatures
    // check if the event was emitted
    expect(identityManagerTen).to.emit(identityManagerTen, "MSTExecuted").withArgs(signers[0].address, txIdActi);
 
    // Continue to sign DEACTI USER
    const signDeactObj = await identityManagerTen.connect(signers[0]).signSubmittedMST(txIdDeact);
    // Check if the MST was signed
    expect(signDeactObj).to.emit(
      identityManagerTen, "MSTSigned").withArgs(signers[0].address, txIdDeact);
    // Check the number of signatures
    const mstInfoDeacti = await identityManagerTen.getMSTInfo(txIdDeact);
    expect(mstInfoDeacti[6]).to.equal(1);
    // Execute a DEACTIVATE USER - when not enough signatures
    await expect(identityManagerTen.connect(signers[0]).executeMST(txIdDeact)).to.be.revertedWith(
      "Not enough signatures to execute transaction");
    const mstInfoDeacti_ = await identityManagerTen.getMSTInfo(txIdDeact);
    expect(mstInfoDeacti_[5]).to.be.false; // isExecuted is expected to be false  
    
    // let's get more signatures 
    await identityManagerTen.connect(signers[1]).signSubmittedMST(txIdDeact);
    await identityManagerTen.connect(signers[2]).signSubmittedMST(txIdDeact); 
    // then two signers revoke their signatures
    await identityManagerTen.connect(signers[1]).revokeSignature(txIdDeact); 
    await identityManagerTen.connect(signers[2]).revokeSignature(txIdDeact);
    // check if the transaction was successfully executed
    await expect(identityManagerTen.connect(signers[0]).executeMST(txIdDeact)).to.be.revertedWith(
      "Not enough signatures to execute transaction");
    // check more details
    const mstInfoDeactiv = await identityManagerTen.getMSTInfo(txIdDeact);
    expect(mstInfoDeactiv[5]).to.equal(false); // isExecuted to be false
    expect(mstInfoDeactiv[6]).to.equal(1); // got 2 signatures
  
    // now 2 owners re-sign and execute MST again
    await identityManagerTen.connect(signers[1]).signSubmittedMST(txIdDeact); 
    await identityManagerTen.connect(signers[2]).signSubmittedMST(txIdDeact);
    await identityManagerTen.connect(signers[0]).executeMST(txIdDeact);
    // Check if MST executed
    const mstInfoDeactiv_ = await identityManagerTen.getMSTInfo(txIdDeact);
    expect(mstInfoDeactiv_[5]).to.equal(true); // isExecuted to be true
    expect(mstInfoDeactiv_[6]).to.equal(3); // got 3 signatures
    // check if the event was emitted
    expect(identityManagerTen).to.emit(identityManagerTen, "MSTExecuted").withArgs(signers[0].address, txIdDeact);
   });
   // ========================= GENERAL FUNCTIONS =============================
   // Test AddObject
    // ADD ADMIN
  it("should add new ADMIN", async function () {
    const signers = await ethers.getSigners();
    const adminAddr = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128";
    const role = ADMIN;
    const name = "Admin1";
    const idType = "CCCD";
    const idValue = "1239456AB32";
    const tx = await identityManagerTen.connect(signers[0]).addObject(adminAddr, role, name, idType, idValue);
    // Check if the event was emitted
    expect(tx).to.emit(identityManagerTen, "adminAdded").withArgs(signers[0].address, adminAddr);
    // Check if the admin was added successfully
    const adminobj = await identityManagerTen.objList_(adminAddr);
    expect(adminobj.isActive).to.be.true;
    // Check if admin counter works
    const adminCounter = await identityManagerTen.getActiveObjCounter(role);
    expect(adminCounter).to.equal(1);
    const objInfo = await identityManagerTen.getObjectInfo(adminAddr);
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
    const tx = await identityManagerTen.connect(signers[0]).addObject(systemAddr, role, name, idType, idValue);
    // Check if the event was emitted
    expect(tx).to.emit(identityManagerTen, "systemAdded").withArgs(signers[0].address, systemAddr);
    // Check if the system address was added successfully
    const sys = await identityManagerTen.objList_(systemAddr);
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
  await expect(identityManagerTen.connect(signers[0]).addObject(
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
  await expect(identityManagerTen.connect(signers[0]).addObject(
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
  const tx = await identityManagerTen.connect(signers[0]).addObject(adminAddr, role, name, idType, idValue);
  // Check if the event was emitted
  expect(tx).to.emit(identityManagerTen, "adminAdded").withArgs(signers[0].address, adminAddr);
  // Check if the admin was added successfully
  const adminobj = await identityManagerTen.objList_(adminAddr);
  expect(adminobj.isActive).to.be.true;
  // Add an existing admin
  await expect(identityManagerTen.connect(signers[0]).addObject(
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
    const tx = await identityManagerTen.connect(signers[6]).addUserWallet(name, idType, idValue);
    // Check if the event was emitted
    expect(tx).to.emit(identityManagerTen, "userWalletAdded").withArgs(userAddr);
    // Check if the user wallet was added successfully
    const userObj = await identityManagerTen.objList_(userAddr);
    expect(userObj.isActive).to.be.false;
    expect(userObj.role).to.equal(USER);
    // Check if user counter works on both total and active 
    const userTotalCounter = await identityManagerTen.getTotalObjCounter(role);
    const userActiveCounter = await identityManagerTen.getActiveObjCounter(role);
    expect(userTotalCounter).to.equal(1);
    expect(userActiveCounter).to.equal(0);
    // Then activate registered user
    await identityManagerTen.connect(signers[0]).activateObject(userAddr);
    const acti = await identityManagerTen.objList_(userAddr);
    expect(acti.isActive).to.equal(true);
    const userActivCounter_ = await identityManagerTen.getActiveObjCounter(role);
    expect(userActivCounter_).to.equal(1);
    // Try to activate that address again
    await expect(identityManagerTen.activateObject(userAddr)).to.be.revertedWith(
      "activateObject: object activated already");
    // Check if address is an owner
    const ownerAddr = signers[0].address;
    await expect(identityManagerTen.activateObject(ownerAddr)).to.be.revertedWith(
      "activateObject: must be executed with MST");
    // Check with an address not existing
    const addr = signers[10].address;
    await expect(identityManagerTen.activateObject(addr)).to.be.revertedWith(
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
     const tx = await identityManagerTen.connect(signers[6]).addUserWallet(name, idType, idValue);
     // Check if the event was emitted
     expect(tx).to.emit(identityManagerTen, "userWalletAdded").withArgs(userAddr);
     // Check if the user wallet was added successfully
     const userObj = await identityManagerTen.objList_(userAddr);
     expect(userObj.isActive).to.be.false;
     expect(userObj.role).to.equal(USER);
     // Check if user counter works on both total and active 
     const userTotalCounter = await identityManagerTen.getTotalObjCounter(role);
     const userActiveCounter = await identityManagerTen.getActiveObjCounter(role);
     expect(userTotalCounter).to.equal(1);
     expect(userActiveCounter).to.equal(0);
     // Then activate registered user
     await identityManagerTen.connect(signers[0]).activateObject(userAddr);
     const acti = await identityManagerTen.objList_(userAddr);
     expect(acti.isActive).to.equal(true);
     const userActivCounter_ = await identityManagerTen.getActiveObjCounter(role);
     expect(userActivCounter_).to.equal(1);
     // Then deactivate user
     await identityManagerTen.connect(signers[1]).deactivateObject(userAddr);
     const obj = await identityManagerTen.objList_(userAddr);
     expect(obj.isActive).to.be.false;
    // Deactive one more time
     await expect(identityManagerTen.deactivateObject(userAddr)).to.be.revertedWith(
                 "deactivateObject: object already deactivated");
    // Check if deactivate an owner
    const ownerAddr = signers[0].address;
    await expect(identityManagerTen.deactivateObject(ownerAddr)).to.be.revertedWith(
      "deactivateObject: for owner, must be executed with MST");
    // Check with an address not existing
    const addr = signers[10].address;
    await expect(identityManagerTen.deactivateObject(addr)).to.be.revertedWith(
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
    const txAdmin = await identityManagerTen.connect(signers[0]).addObject(adminAddr_, role_, name_, idType_, idValue_);
    // Check if the event was emitted
    expect(txAdmin).to.emit(identityManagerTen, "adminAdded").withArgs(adminAddr_);
    // Check if the admin was added successfully
    const adminObj = await identityManagerTen.objList_(adminAddr_);
    expect(adminObj.isActive).to.be.true;
    expect(adminObj.role).to.equal(ADMIN);
    // Then deactivate admin
    await identityManagerTen.connect(signers[1]).deactivateObject(adminAddr_);
    const adminObj_ = await identityManagerTen.objList_(adminAddr_);
    expect(adminObj_.isActive).to.be.false;
     });
    it("should deactivate a system address", async function () {
    const signers = await ethers.getSigners();
    const systemAddr_ = signers[8].address;
    const role_ = SYSTEM;
    const name_ = "Router";
    const idType_ = "N/a";
    const idValue_ = "N/a";
    const txSys = await identityManagerTen.connect(signers[0]).addObject(systemAddr_, role_, name_, idType_, idValue_);
    // Check if the event was emitted
    expect(txSys).to.emit(identityManagerTen, "systemAdded").withArgs(systemAddr_);
    // Check if system address was added successfully
    const sysTx_ = await identityManagerTen.objList_(systemAddr_);
    expect(sysTx_.isActive).to.be.true;
    expect(sysTx_.role).to.equal(SYSTEM);
    // Then deactivate system address
    await identityManagerTen.connect(signers[1]).deactivateObject(systemAddr_);
    const sysTx = await identityManagerTen.objList_(systemAddr_);
    expect(sysTx.isActive).to.be.false;
      });
    //Deactivate an owner    
    it("should fail if deactivate an owner", async function () {
    const signers = await ethers.getSigners();
    const ownerAddr_ = signers[2].address;
    // Then try deactivate owner without MST
    await expect(identityManagerTen.deactivateObject(ownerAddr_)).to.be.revertedWith(
        "deactivateObject: for owner, must be executed with MST");
      });
  // Test updateObject
  it("should update user information successfully ", async function () {
    const signers = await ethers.getSigners();
    // First we add a user wallet
    await identityManagerTen.connect(signers[5]).addUserWallet("NguyenTriBang", "GPLX", "gplx12344");
    const getInfoTx = await identityManagerTen.connect(signers[0]).objList_(signers[5].address);
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
    const userTx_ = await identityManagerTen.connect(signers[0]).updateObjectInfo(userAddr, name_, idType_, idValue_, isKYC_, 1);
    // Check if the event was emitted
    expect(userTx_).to.emit(identityManagerTen, "userUpdated").withArgs(signers[0].address, userAddr);
    const updateTx = await identityManagerTen.connect(signers[0]).objList_(signers[5].address);
    expect(updateTx.name).to.equal("Nguyen Tri Bang");
    expect(updateTx.idType).to.equal("CCCD");
    expect(updateTx.idValue).to.equal("1234asdq23s");
    expect(updateTx.role).to.equal(USER);
    expect(updateTx.isKYC).to.equal(true);
  });
  it("should update owner information successfully ", async function () {
    const signers = await ethers.getSigners();
    // Update user info
    const ownerAddr = signers[1].address;
    const name_ = "Tran Quoc Viet";
    const idType_ = "GPLX";
    const idValue_ = "1234123Gs";
    const isKYC_ = true;    
    // Check the role of caller if a user
    await expect(identityManagerTen.connect(signers[5]).updateObjectInfo(ownerAddr, name_, idType_, idValue_, isKYC_,1)).to.be.revertedWith(
      "Not authorized as admin!");
    const ownerTx_ = await identityManagerTen.connect(signers[0]).updateObjectInfo(ownerAddr, name_, idType_, idValue_, isKYC_,1);
    // Check if the event was emitted
    expect(ownerTx_).to.emit(identityManagerTen, "ownerUpdated").withArgs(signers[0].address, ownerAddr);
    const updateTx = await identityManagerTen.connect(signers[0]).objList_(signers[1].address);
    expect(updateTx.name).to.equal("Tran Quoc Viet");
    expect(updateTx.idType).to.equal("GPLX");
    expect(updateTx.idValue).to.equal("1234123Gs");
    expect(updateTx.role).to.equal(OWNER);
    expect(updateTx.isKYC).to.equal(isKYC_);
  });
  // Test getObjectInfo
  it("should get owner info successfully ", async function () {
    const signers = await ethers.getSigners();
    // Update user info
    const ownerAddr = signers[2].address;
    const name_ = "Tran Quoc Viet";
    const idType_ = "GPLX";
    const idValue_ = "1234123Gs";
    const isKYC_ = true;    
    // Should revert if the role of caller is user
    await expect(identityManagerTen.connect(signers[5]).updateObjectInfo(ownerAddr, name_, idType_, idValue_, isKYC_,1)).to.be.revertedWith(
      "Not authorized as admin!");
    await identityManagerTen.connect(signers[0]).updateObjectInfo(ownerAddr, name_, idType_, idValue_, isKYC_,1);
    const getTx = await identityManagerTen.connect(signers[0]).getObjectInfo(ownerAddr);
    expect(getTx[0]).to.equal("Tran Quoc Viet");
    expect(getTx[1]).to.equal("GPLX");
    expect(getTx[2]).to.equal("1234123Gs");
    expect(getTx[3]).to.equal(OWNER);
    expect(getTx[7]).to.equal(isKYC_);
  });
  // Test isObjectExisting
  it("should revert if user not existing ", async function () {
    const signers = await ethers.getSigners();
    // Should fail it pass an invalid address
    await expect(identityManagerTen.connect(signers[0]).isObjectExisting("0x0000000000000000000000000000000000000000")).to.be.revertedWith(
      "isObjectExisting: invalid address!");
  });

  //=============== TEST NEW FUNCTION ==================
  // sayGoodbye to a user
  it("should say goodbye to a user", async function () {
     expect(await identityManagerTen.sayGoodbye("See you again...")).to.equal("Goodbye See you again...");
  });
  
  it("should update object information", async function () {
    const addr_ = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128";
    // add new object
    await identityManagerTen.addNewObject(addr_, 8, "signers888");
    // update object info
    await identityManagerTen.updateNewObjectInfo(addr_, 8, "signers8");
    // get object info
    const newObjInfo_ = await identityManagerTen.newObjList_(addr_);
    expect(newObjInfo_.name).to.equal("signers8");
 });

})

/* TEST RESULT V10
==> succeed!!!
*/
