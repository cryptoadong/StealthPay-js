import "mocha";
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { expectRejection } from './utils';
import { JsonRpcSigner } from '../src/ethers';
import { Wallet } from 'ethers';

import { SPayment } from '../src/classes/SPayment';
import { StealthKeyRegistry } from '../src/classes/StealthKeyRegistry';

//注册合约
const stealthKeyRegistryAddress = '0x3bf549749C72F25FAc0DF3574849c5fC54De65B1';

describe('StealthKeyRegistry class', () => {
  let stealthKeyRegistry: StealthKeyRegistry;

  // 将会在每个测试用例执行前执行，可以用于准备测试用例所需的前置条件
  beforeEach(() => {
    stealthKeyRegistry = new StealthKeyRegistry(ethers.provider);
  });

  //验证合约地址
  it('constructor: sets the registry contract', async () => {
    expect(stealthKeyRegistry._registry.address).to.equal(stealthKeyRegistryAddress);
  });

  //getStealthKeys: 如果账户没有注册隐身钥匙，则抛出。
  it('getStealthKeys: throws if account has not registered stealth keys', async () => {
    const account = Wallet.createRandom().address;
    const errorMsg = `Address ${account} has not registered stealth keys. Please ask them to setup their SPayment account`;


    const { spendingPublicKey, viewingPublicKey } = await stealthKeyRegistry.getStealthKeys("0xbC61B73d3b8eea27Ce69AaE05C2457a5ADA04438")
    // console.log("spendingPublicKey:", spendingPublicKey);
    // console.log("viewingPublicKey:", viewingPublicKey);

    await expectRejection(stealthKeyRegistry.getStealthKeys(account), errorMsg);
  });

  //如果注册表没有签名者，并且没有指定签名者，则抛出该问题。
  //如果只有公钥是不可以 setStealthKeys
  // it('setStealthKeys: throws if registry has no signer and a signer is not specified', async () => {
  //   // this error comes from ethers, but useful to test to ensure a default signer isn't somehow used
  //   const pubkey = Wallet.createRandom().publicKey;
  //   const errorMsg = 'sending a transaction requires a signer (operation="sendTransaction", code=UNSUPPORTED_OPERATION, version=contracts/5.6.2)'; // prettier-ignore
  //   await expectRejection(stealthKeyRegistry.setStealthKeys(pubkey, pubkey), errorMsg);
  // });

  //签名并且通过签名获取值才可以setStealthKeys
  it('sets and gets stealth keys', async () => {
    // Generate keys
    const [user] = await ethers.getSigners(); // type SignerWithAddress
    const userSigner = (user as unknown) as JsonRpcSigner; // type cast to avoid TS errors

    const umbra = new SPayment(ethers.provider, 5);

    //通过签名生成spendingKeyPair和viewingKeyPair
    const { spendingKeyPair: spendKey, viewingKeyPair: viewKey } = await umbra.generatePrivateKeys(userSigner);

    // Set keys
    await stealthKeyRegistry.setStealthKeys(spendKey.publicKeyHex, viewKey.publicKeyHex, userSigner);

    // Get keys and validate they match
    const { spendingPublicKey, viewingPublicKey } = await stealthKeyRegistry.getStealthKeys(user.address);

    expect(spendingPublicKey).to.equal(spendKey.publicKeyHex);
    expect(viewingPublicKey).to.equal(viewKey.publicKeyHex);
  });
});
