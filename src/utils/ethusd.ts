/**
 * @dev Functions for interacting with the ChainLink ETH/USD
 */

import { EthersProvider } from '../types';
import { createContract } from './utils';
import { ETHUSD_CHAINLINK_ABI } from './constants';



//ChainLink ETH/USD Contract Address
//const ethusdChainLinkAddress = '0xA39434A63A52E749F02807ae27335515BA4b07F7'; // Etherum MainNet

/**
 * @notice Return to the ChainLink ETH/USD price on the main network.
 * @param provider Ethers provider
 */
export const getResolverContract = async (ethusdContractAddress: string,provider: EthersProvider) => {
  const contract = createContract(ethusdContractAddress, ETHUSD_CHAINLINK_ABI, provider);
  const { answer } = await contract.latestRoundData();
  const decimals=await contract.decimals();
  return { answer ,decimals}
};


