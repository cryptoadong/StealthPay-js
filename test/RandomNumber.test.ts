import { RandomNumber } from '../src/classes/RandomNumber';
import { expect } from 'chai';
import { BigNumber, isHexString } from '../src/ethers';

const numberOfRuns = 10; // number of runs for tests that execute in a loop

describe('RandomNumber class', () => {
  let random: RandomNumber;

  beforeEach(() => {
    random = new RandomNumber();
  });

  it('initializes an instance with a random BigNumber', () => {
    const { value } = random;
    expect(value.constructor).to.equal(BigNumber);
  });

  it('returns random value as a 32 byte hex string', () => {
    for (let i = 0; i < numberOfRuns; i += 1) {

      /**
       *  RandomNumber格式
    RandomNumber {
      sizeInBytes: 32,
      value: BigNumber {
      _hex: '0xed554b0c2466db30a03d46f9c27ad25a29c3f3f8bc0cfd8e3d1d4e1be7f6cd20',
        _isBigNumber: true
      }
    }
       */
      random = new RandomNumber();
      //console.log("random:", random);

      const hex = random.asHex;

      //console.log("Hex:", hex);

      expect(isHexString(hex)).to.be.true;
      //console.log("Hex length:", hex.length);

      expect(hex.length).to.equal(66); // 32 bytes plus leading 0x prefix
    }
  });

  it('returns random value as a hex string without the 0x prefix', () => {
    for (let i = 0; i < numberOfRuns; i += 1) {
      random = new RandomNumber();
      const hex = random.asHexSlim;
      expect(isHexString(hex)).to.be.false;
      expect(hex.length).to.equal(64); // 32 bytes without 0x prefix
    }
  });

  it('asHex and asHexSlim are equivalent', () => {
    const hex = random.asHex;
    const first16Bytes = hex.slice(2, 34);
    const last16Bytes = hex.slice(34);

    const hexSlim = random.asHexSlim;
    const first16BytesSlim = hexSlim.slice(0, 32);
    const last16BytesSlim = hexSlim.slice(32);

    expect(first16Bytes).to.equal(first16BytesSlim);
    expect(last16Bytes).to.equal(last16BytesSlim);
  });
});
