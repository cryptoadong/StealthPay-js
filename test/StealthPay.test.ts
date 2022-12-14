import 'mocha';
import { ethers } from 'hardhat';
import hardhatConfig from '../hardhat.config';
import { StealthPay } from '../src/classes/StealthPay';
import { BigNumberish, BigNumber, StaticJsonRpcProvider, Wallet } from '../src/ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { HardhatNetworkHDAccountsUserConfig } from 'hardhat/src/types/config';
import { expect } from 'chai';
import { expectRejection } from './utils';
import { testPrivateKeys } from './testPrivateKeys';
import type { ChainConfig } from '../src/types';
import {
  TestToken as ERC20,
  StealthPay as StealthPayContract,
  TestTokenFactory as ERC20__factory,
  StealthPayFactory as StealthPay__factory,
} from '@cryptoadong/stealthpay-contracts-core';

const { parseEther } = ethers.utils;
const ethersProvider = ethers.provider;
const jsonRpcProvider = new StaticJsonRpcProvider(hardhatConfig.networks?.hardhat?.forking?.url);

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const quantity = parseEther('5');
const overrides = { supportPubKey: true }; // we directly enter a pubkey in these tests for convenience

// We don't use the 0 or 1 index just to reduce the chance of conflicting with a signer for another use case
const senderIndex = 2;
const receiverIndex = 3;

describe('StealthPay class', () => {
  let sender: Wallet;
  let receiver: Wallet;
  let deployer: SignerWithAddress;

  let dai: ERC20;
  let stealthpay: StealthPay;
  let chainConfig: ChainConfig;

  const getEthBalance = async (address: string) => {
    return (await ethersProvider.getBalance(address)).toString();
  };
  const verifyEqualValues = (val1: BigNumberish, val2: BigNumberish) => {
    expect(BigNumber.from(val1).toString()).to.equal(BigNumber.from(val2).toString());
  };

  before(async () => {
    // Load signers' mnemonic and derivation path from hardhat config
    const accounts = hardhatConfig.networks?.hardhat?.accounts as HardhatNetworkHDAccountsUserConfig;
    const { mnemonic, path } = accounts;

    // Get the wallets of interest. The hardhat signers are generated by appending "/index" to the derivation path,
    // so we do the same to instantiate our wallets. Private key can now be accessed by `sender.privateKey`
    sender = ethers.Wallet.fromMnemonic(mnemonic as string, `${path as string}/${senderIndex}`);
    sender.connect(ethers.provider);
    receiver = ethers.Wallet.fromMnemonic(mnemonic as string, `${path as string}/${receiverIndex}`);
    receiver.connect(ethers.provider);

    // Load other signers
    deployer = (await ethers.getSigners())[0]; // used for deploying contracts
  });

  beforeEach(async () => {
    // Deploy StealthPay
    const toll = parseEther('0.1');
    const tollCollector = ethers.constants.AddressZero; // doesn't matter for these tests
    const tollReceiver = ethers.constants.AddressZero; // doesn't matter for these tests
    const stealthpayFactory = new StealthPay__factory(deployer);
    const stealthpayContract = (await stealthpayFactory.deploy(toll, tollCollector, tollReceiver)) as StealthPayContract;
    await stealthpayContract.deployTransaction.wait();

    // Deploy mock tokens
    const daiFactory = new ERC20__factory(deployer);
    dai = (await daiFactory.deploy('Dai', 'DAI')) as ERC20;
    await dai.deployTransaction.wait();

    // Get chainConfig based on most recent Rinkeby block number to minimize scanning time
    const lastBlockNumber = await ethersProvider.getBlockNumber();
    chainConfig = {
      chainId: (await ethersProvider.getNetwork()).chainId,
      stealthpayAddress: stealthpayContract.address,
      startBlock: lastBlockNumber,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/cryptoadong/stealthpaypolygon',
    };

    // Get StealthPay instance
    stealthpay = new StealthPay(ethersProvider, chainConfig);
  });

  describe('Initialization', () => {
    //???????????????????????????????????????????????????
    it('initializes correctly when passing a chain config', async () => {
      // URL provider
      const stealthpay1 = new StealthPay(jsonRpcProvider, chainConfig);
      console.log('stealthpay1 chainId:', stealthpay1.chainConfig.chainId);
      console.log('stealthpay1 stealthpayAddress:', stealthpay1.chainConfig.stealthpayAddress);
      expect(stealthpay1.provider._isProvider).to.be.true;
      expect(stealthpay1.chainConfig.stealthpayAddress).to.equal(chainConfig.stealthpayAddress);
      expect(stealthpay1.chainConfig.startBlock).to.equal(chainConfig.startBlock);
      expect(stealthpay1.chainConfig.subgraphUrl).to.equal(chainConfig.subgraphUrl);

      // Web3 provider
      const stealthpay2 = new StealthPay(ethersProvider, chainConfig);
      expect(stealthpay2.provider._isProvider).to.be.true;
      expect(stealthpay2.chainConfig.stealthpayAddress).to.equal(chainConfig.stealthpayAddress);
      expect(stealthpay2.chainConfig.startBlock).to.equal(chainConfig.startBlock);
      expect(stealthpay2.chainConfig.subgraphUrl).to.equal(chainConfig.subgraphUrl);

      console.log('stealthpay2 chainId:', stealthpay1.chainConfig.chainId);
      console.log('stealthpay2 stealthpayAddress:', stealthpay1.chainConfig.stealthpayAddress);
    });
    //????????????????????????chainId??????????????????????????????
    it('initializes correctly when passing a default chainId', async () => {
      // --- Localhost ---
      // URL provider
      // const stealthpay1 = new StealthPay(jsonRpcProvider, 1337);
      // expect(stealthpay1.chainConfig.stealthpayAddress).to.equal('0x39C06e5630455166AeAE0bDedd07eddca765E7eA');
      // expect(stealthpay1.chainConfig.startBlock).to.equal(8505089);
      // expect(stealthpay1.chainConfig.subgraphUrl).to.equal(false);
      // // Web3 provider
      // const stealthpay2 = new StealthPay(ethersProvider, 1337);
      // expect(stealthpay2.chainConfig.stealthpayAddress).to.equal('0x39C06e5630455166AeAE0bDedd07eddca765E7eA');
      // expect(stealthpay2.chainConfig.startBlock).to.equal(8505089);
      // expect(stealthpay2.chainConfig.subgraphUrl).to.equal(false);
      // --- Goerli ---
      // const stealthpay3 = new StealthPay(jsonRpcProvider, 5);
      // expect(stealthpay3.chainConfig.stealthpayAddress).to.equal('0x39C06e5630455166AeAE0bDedd07eddca765E7eA');
      // expect(stealthpay3.chainConfig.startBlock).to.equal(7718444);
      // expect(stealthpay3.chainConfig.subgraphUrl).to.equal('https://api.thegraph.com/subgraphs/name/cryptoadong/stealthpaygoerli');
      // // --- Mainnet ---
      // const stealthpay4 = new StealthPay(jsonRpcProvider, 1);
      // expect(stealthpay4.chainConfig.stealthpayAddress).to.equal('0x39C06e5630455166AeAE0bDedd07eddca765E7eA');
      // expect(stealthpay4.chainConfig.startBlock).to.equal(12343914);
      // expect(stealthpay4.chainConfig.subgraphUrl).to.equal('https://api.thegraph.com/subgraphs/name/cryptoadong/stealthpaymainnet');
      // // --- Optimism ---
      // const stealthpay5 = new StealthPay(jsonRpcProvider, 10);
      // expect(stealthpay5.chainConfig.stealthpayAddress).to.equal('0x39C06e5630455166AeAE0bDedd07eddca765E7eA');
      // expect(stealthpay5.chainConfig.startBlock).to.equal(4069556);
      // expect(stealthpay5.chainConfig.subgraphUrl).to.equal('https://api.thegraph.com/subgraphs/name/cryptoadong/stealthpayoptimism'); // prettier-ignore
      // // --- Polygon ---
      // const stealthpay6 = new StealthPay(jsonRpcProvider, 137);
      // expect(stealthpay6.chainConfig.stealthpayAddress).to.equal('0x39C06e5630455166AeAE0bDedd07eddca765E7eA');
      // expect(stealthpay6.chainConfig.startBlock).to.equal(20717318);
      // expect(stealthpay6.chainConfig.subgraphUrl).to.equal('https://api.thegraph.com/subgraphs/name/cryptoadong/stealthpaypolygon');
      // // --- Arbitrum ---
      // const stealthpay7 = new StealthPay(jsonRpcProvider, 42161);
      // expect(stealthpay7.chainConfig.stealthpayAddress).to.equal('0x39C06e5630455166AeAE0bDedd07eddca765E7eA');
      // expect(stealthpay7.chainConfig.startBlock).to.equal(7285883);
      // expect(stealthpay7.chainConfig.subgraphUrl).to.equal('https://api.thegraph.com/subgraphs/name/cryptoadong/stealthpayarbitrumone'); // prettier-ignore
    });
    //??????????????????IDS
    // it('does not allow invalid default chain IDs to be provided', async () => {
    //   const msg = 'Unsupported chain ID provided';
    //   const constructor1 = () => new StealthPay(jsonRpcProvider, 999);
    //   const constructor2 = () => new StealthPay(ethersProvider, 999);
    //   expect(constructor1).to.throw(msg);.

    //   expect(constructor2).to.throw(msg);
    // });
  });

  // describe('Private key generation', () => {
  //   it('properly generates private keys', async () => {
  //     // We use 100 because that's how many initial accounts are generated in the hardhat config
  //     for (let i = 0; i < 100; i += 1) {
  //       // We must use a default hardhat account so hardhat has access to the private key to sign with
  //       // `provider.send('personal_sign', [params])`, but we instantiate the wallet manually with the
  //       // private key since the SignerWithAddress type is not a valid input type to generatePrivateKeys

  //       const walletHardhat = (await ethers.getSigners())[i];
  //       const wallet = new Wallet(testPrivateKeys[i]);
  //       if (walletHardhat.address !== wallet.address) throw new Error('Address mismatch');

  //       const { spendingKeyPair, viewingKeyPair } = await stealthpay.generatePrivateKeys(wallet);

  //       expect(spendingKeyPair.privateKeyHex).to.have.length(66);
  //       expect(viewingKeyPair.privateKeyHex).to.have.length(66);
  //     }
  //   });
  // });

  describe('Send, scan, and withdraw funds', () => {
    beforeEach(() => {
      // Seems we somehow lose the provider attached to our sender, so make sure it's there. Without this
      // some tests below throw with "Error: missing provider (operation="sendTransaction", code=UNSUPPORTED_OPERATION, version=abstract-signer/5.0.12)"
      sender = sender.connect(ethers.provider);
    });

    const mintAndApproveDai = async (signer: Wallet, user: string, amount: BigNumber) => {
      await dai.connect(signer).mint(user, amount);
      await dai.connect(signer).approve(stealthpay.stealthpayContract.address, ethers.constants.MaxUint256);
    };

    it('reverts if sender does not have enough tokens', async () => {
      const msg = `Insufficient balance to complete transfer. Has 0 tokens, tried to send ${quantity.toString()} tokens.`;
      await expectRejection(stealthpay.send(sender, dai.address, quantity, receiver.address), msg);
    });

    it('reverts if sender does not have enough ETH', async () => {
      // ETH balance is checked by ethers when sending a transaction and therefore does not need to
      // be tested here. If the user has insufficient balance it will throw with
      // `insufficient funds for gas * price + value`
    });

    it('Without payload extension: send tokens, scan for them, withdraw them', async () => {
      // SENDER
      // Mint Dai to sender, and approve the StealthPay contract to spend their DAI
      await mintAndApproveDai(sender, sender.address, quantity);

      // Send funds with StealthPay
      const { tx, stealthKeyPair } = await stealthpay.send(sender, dai.address, quantity, receiver!.publicKey, overrides);
      await tx.wait();

      // RECEIVER
      // Receiver scans for funds sent to them
      const { userAnnouncements } = await stealthpay.scan(receiver.publicKey, receiver.privateKey);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw (test regular withdrawal, so we need to transfer ETH to pay gas)
      // Destination wallet should have a balance equal to amount sent

      // First we send ETH to the stealth address
      await sender.sendTransaction({
        to: stealthKeyPair.address,
        value: parseEther('1'),
      });

      // Now we withdraw the tokens
      const stealthPrivateKey = StealthPay.computeStealthPrivateKey(
        receiver.privateKey,
        userAnnouncements[0].randomNumber
      );
      const destinationWallet = ethers.Wallet.createRandom();
      verifyEqualValues(await dai.balanceOf(destinationWallet.address), 0);
      const withdrawTxToken = await stealthpay.withdraw(stealthPrivateKey, dai.address, destinationWallet.address);
      await withdrawTxToken.wait();
      verifyEqualValues(await dai.balanceOf(destinationWallet.address), quantity);
      verifyEqualValues(await dai.balanceOf(stealthKeyPair.address), 0);

      // And for good measure let's withdraw the rest of the ETH
      const initialEthBalance = await getEthBalance(stealthKeyPair.address);
      const withdrawTxEth = await stealthpay.withdraw(stealthPrivateKey, ETH_ADDRESS, destinationWallet.address);
      await withdrawTxEth.wait();
      const withdrawEthReceipt = await ethersProvider.getTransactionReceipt(withdrawTxEth.hash);
      const withdrawTokenTxCost = withdrawEthReceipt.gasUsed.mul(withdrawEthReceipt.effectiveGasPrice);
      verifyEqualValues(await getEthBalance(stealthKeyPair.address), 0);
      verifyEqualValues(
        await getEthBalance(destinationWallet.address),
        BigNumber.from(initialEthBalance).sub(withdrawTokenTxCost)
      );
    });

    it('With payload extension: send tokens, scan for them, withdraw them', async () => {
      // SENDER
      // Mint Dai to sender, and approve the StealthPay contract to spend their DAI
      await mintAndApproveDai(sender, sender.address, quantity);

      // Send funds with StealthPay
      const { tx, stealthKeyPair } = await stealthpay.send(sender, dai.address, quantity, receiver!.publicKey, overrides);
      await tx.wait();

      // RECEIVER
      // Receiver scans for funds sent to them
      const { userAnnouncements } = await stealthpay.scan(receiver.publicKey, receiver.privateKey);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw (test withdraw by signature)
      const destinationWallet = ethers.Wallet.createRandom();
      const relayerWallet = ethers.Wallet.createRandom();
      const sponsorWallet = ethers.Wallet.createRandom();
      const sponsorFee = '2500';

      // Fund relayer
      await sender.sendTransaction({
        to: relayerWallet.address,
        value: parseEther('1'),
      });

      // Get signature
      const stealthPrivateKey = StealthPay.computeStealthPrivateKey(
        receiver.privateKey,
        userAnnouncements[0].randomNumber
      );
      const { v, r, s } = await StealthPay.signWithdraw(
        stealthPrivateKey,
        (
          await ethersProvider.getNetwork()
        ).chainId,
        stealthpay.stealthpayContract.address,
        destinationWallet.address,
        dai.address,
        sponsorWallet.address,
        sponsorFee
      );

      // Relay transaction
      await stealthpay.withdrawOnBehalf(
        relayerWallet,
        stealthKeyPair.address,
        destinationWallet.address,
        dai.address,
        sponsorWallet.address,
        sponsorFee,
        v,
        r,
        s
      );
      const expectedAmountReceived = BigNumber.from(quantity).sub(sponsorFee);
      verifyEqualValues(await dai.balanceOf(destinationWallet.address), expectedAmountReceived);
      verifyEqualValues(await dai.balanceOf(stealthKeyPair.address), 0);
      verifyEqualValues(await dai.balanceOf(sponsorWallet.address), sponsorFee);
    });

    it('Without payload extension: send ETH, scan for it, withdraw it', async () => {
      // SENDER
      // Send funds with StealthPay
      const { tx, stealthKeyPair } = await stealthpay.send(sender, ETH_ADDRESS, quantity, receiver!.publicKey, overrides);
      await tx.wait();
      verifyEqualValues(await getEthBalance(stealthKeyPair.address), quantity);

      // RECEIVER
      // Receiver scans for funds sent to them
      const { userAnnouncements } = await stealthpay.scan(receiver.publicKey, receiver.privateKey);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw (test regular withdrawal)
      // Destination wallet should have a balance equal to amount sent minus gas cost
      const stealthPrivateKey = StealthPay.computeStealthPrivateKey(
        receiver.privateKey,
        userAnnouncements[0].randomNumber
      );
      const destinationWallet = ethers.Wallet.createRandom();
      const withdrawTx = await stealthpay.withdraw(stealthPrivateKey, 'ETH', destinationWallet.address);
      await withdrawTx.wait();
      const receipt = await ethers.provider.getTransactionReceipt(withdrawTx.hash);
      const txCost = withdrawTx.gasLimit.mul(receipt.effectiveGasPrice);
      verifyEqualValues(await getEthBalance(destinationWallet.address), quantity.sub(txCost));
      verifyEqualValues(await getEthBalance(stealthKeyPair.address), 0);
    });

    it('With payload extension: send ETH, scan for it, withdraw it', async () => {
      // SENDER
      // Send funds with StealthPay
      const { tx, stealthKeyPair } = await stealthpay.send(sender, ETH_ADDRESS, quantity, receiver.publicKey, overrides);
      await tx.wait();

      // RECEIVER
      // Receiver scans for funds send to them
      const { userAnnouncements } = await stealthpay.scan(receiver.publicKey, receiver.privateKey);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw (test regular withdrawal)
      // Destination wallet should have a balance equal to amount sent minus gas cost
      const stealthPrivateKey = StealthPay.computeStealthPrivateKey(
        receiver.privateKey,
        userAnnouncements[0].randomNumber
      );
      const destinationWallet = ethers.Wallet.createRandom();
      const withdrawTx = await stealthpay.withdraw(stealthPrivateKey, 'ETH', destinationWallet.address);
      await withdrawTx.wait();
      const receipt = await ethers.provider.getTransactionReceipt(withdrawTx.hash);
      const txCost = withdrawTx.gasLimit.mul(receipt.effectiveGasPrice);
      verifyEqualValues(await getEthBalance(destinationWallet.address), quantity.sub(txCost));
      verifyEqualValues(await getEthBalance(stealthKeyPair.address), 0);
    });
  });

  describe('Input validation', () => {
    // ts-expect-error statements needed throughout this section to bypass TypeScript checks that would stop this file
    // from being compiled/ran

    it('throws when initializing with an invalid chainConfig', () => {
      const errorMsg1 = "Invalid start block provided in chainConfig. Got 'undefined'";
      const errorMsg2 = "Invalid start block provided in chainConfig. Got '1'";
      const badChainId = '1.1';
      const errorMsg3 = `Invalid chainId provided in chainConfig. Got '${badChainId}'`;
      const errorMsg4 = "Invalid subgraphUrl provided in chainConfig. Got 'undefined'";
      const stealthpayAddress = '0x39C06e5630455166AeAE0bDedd07eddca765E7eA'; // address does not matter here

      // @ts-expect-error
      expect(() => new StealthPay(ethersProvider)).to.throw('chainConfig not provided');
      // @ts-expect-error
      expect(() => new StealthPay(ethersProvider, {})).to.throw(errorMsg1);
      // @ts-expect-error
      expect(() => new StealthPay(ethersProvider, { stealthpayAddress })).to.throw(errorMsg1);
      // @ts-expect-error
      expect(
        () =>
          new StealthPay(ethersProvider, {
            stealthpayAddress: '123',
            startBlock: '1',
            subgraphUrl: false,
          })
      ).to.throw(errorMsg2);
      expect(
        // @ts-expect-error
        () =>
          new StealthPay(ethersProvider, {
            stealthpayAddress: '123',
            startBlock: 1,
            chainId: badChainId,
            subgraphUrl: false,
          })
      ).to.throw(errorMsg3);
      // @ts-expect-error
      expect(
        () =>
          new StealthPay(ethersProvider, {
            stealthpayAddress: '123',
            startBlock: 1,
            chainId: 1,
          })
      ).to.throw(errorMsg4);
      // @ts-expect-error
      expect(
        () =>
          new StealthPay(ethersProvider, {
            startBlock: 0,
            chainId: 4,
            subgraphUrl: false,
          })
      ).to.throw('invalid address (argument="address", value=undefined, code=INVALID_ARGUMENT, version=address/5.6.1)');
    });

    it('throws when isEth is passed a bad address', async () => {
      // These error messages come from ethers
      await expectRejection(
        stealthpay.send(sender, '123', '1', ETH_ADDRESS),
        'invalid address (argument="address", value="123", code=INVALID_ARGUMENT, version=address/5.6.1)'
      );
      await expectRejection(
        // @ts-expect-error
        stealthpay.send(sender, 123, '1', ETH_ADDRESS),
        'invalid address (argument="address", value=123, code=INVALID_ARGUMENT, version=address/5.6.1)'
      );
    });

    it('throws when signWithdraw is passed a bad address', async () => {
      // Actual values of input parameters don't matter for this test
      const privateKey = receiver.privateKey;
      const goodAddress = receiver.address;
      const badAddress = '0x123';
      const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // address does not matter here
      // These error messages come from ethers
      await expectRejection(
        StealthPay.signWithdraw(
          privateKey,
          4,
          stealthpay.stealthpayContract.address,
          badAddress,
          tokenAddress,
          goodAddress,
          '1'
        ),
        'invalid address (argument="address", value="0x123", code=INVALID_ARGUMENT, version=address/5.6.1)'
      );
      await expectRejection(
        StealthPay.signWithdraw(
          privateKey,
          4,
          stealthpay.stealthpayContract.address,
          goodAddress,
          tokenAddress,
          badAddress,
          '1'
        ),
        'invalid address (argument="address", value="0x123", code=INVALID_ARGUMENT, version=address/5.6.1)'
      );
      await expectRejection(
        StealthPay.signWithdraw(privateKey, 4, badAddress, goodAddress, tokenAddress, goodAddress, '1'),
        'invalid address (argument="address", value="0x123", code=INVALID_ARGUMENT, version=address/5.6.1)'
      );
    });

    it('throws when signWithdraw is passed a bad chainId', async () => {
      // Actual values of input parameters don't matter for this test
      const privateKey = receiver.privateKey;
      const address = receiver.address;
      const badChainId = '4';
      const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // address does not matter here
      await expectRejection(
        // @ts-expect-error
        StealthPay.signWithdraw(
          privateKey,
          badChainId,
          stealthpay.stealthpayContract.address,
          address,
          tokenAddress,
          address,
          '1'
        ),
        `Invalid chainId provided in chainConfig. Got '${badChainId}'`
      );
    });

    it('throws when signWithdraw is passed a bad data string', async () => {
      // Actual values of input parameters don't matter for this test
      const privateKey = receiver.privateKey;
      const address = receiver.address;
      const badData = 'qwerty';
      const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // address does not matter here
      await expectRejection(
        StealthPay.signWithdraw(
          privateKey,
          4,
          stealthpay.stealthpayContract.address,
          address,
          tokenAddress,
          address,
          '1',
          ethers.constants.AddressZero,
          badData
        ),
        'Data string must be null or in hex format with 0x prefix'
      );
    });
  });
});
