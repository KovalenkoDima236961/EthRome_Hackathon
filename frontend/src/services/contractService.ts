import { ethers } from 'ethers';
import { debug } from '../utils/debug';

// Contract ABI - only the functions we need
const CONTRACT_ABI = [
  {
    "inputs":[{"internalType":"bytes32","name":"pdfHash","type":"bytes32"}],
    "name":"isPdfHashUsed",
    "outputs":[{"internalType":"bool","name":"","type":"bool"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[
      {"internalType":"address","name":"to","type":"address"},
      {"internalType":"string","name":"_tokenURI","type":"string"},
      {"internalType":"bytes32","name":"_pdfHash","type":"bytes32"},
      {"internalType":"bytes32","name":"_merkleRoot","type":"bytes32"},
      {"internalType":"uint256","name":"_deadline","type":"uint256"},
      {"internalType":"bytes","name":"signature","type":"bytes"}
    ],
    "name":"mintWithIssuerSig",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"nonpayable",
    "type":"function"
  }
];

// Contract configuration
const CONTRACT_ADDRESS = '0xe043B560F711dE2d43702A804223504E60CFA488';

// Network configuration for Polkadot Paseo Passethub
const NETWORK_CONFIG = {
  chainId: '0x1a4', // 420 in decimal for Paseo Passethub
  chainName: 'Paseo Passethub',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-paseo.polkadot.tech'],
  blockExplorerUrls: ['https://paseo.polkadot.tech'],
};

// Alternative chain IDs that might be used for Paseo Passethub
const VALID_CHAIN_IDS = ['0x1a4', '420', 420];

export class ContractService {
  private contract: ethers.Contract;
  private provider: ethers.BrowserProvider;

  constructor(provider: ethers.BrowserProvider) {
    this.provider = provider;
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  }

  /**
   * Check if a PDF hash has already been used
   */
  async isPdfHashUsed(pdfHash: string): Promise<boolean> {
    try {
      debug.log('ContractService: Checking PDF hash:', pdfHash);
      debug.log('ContractService: Contract address:', CONTRACT_ADDRESS);
      
      // Convert hex string to bytes32
      const hashBytes32 = ethers.getBytes(pdfHash);
      debug.log('ContractService: Hash as bytes32:', hashBytes32);
      
      debug.log('ContractService: Calling contract method...');
      const result = await this.contract.isPdfHashUsed(hashBytes32);
      debug.log('ContractService: Contract returned:', result);
      
      return result;
    } catch (error: any) {
      debug.error('ContractService: Error checking PDF hash:', error);
      
      // Provide more specific error information
      if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error: Unable to connect to blockchain');
      } else if (error.code === 'CALL_EXCEPTION') {
        throw new Error('Smart contract call failed: ' + error.reason);
      } else if (error.message?.includes('revert')) {
        throw new Error('Smart contract execution reverted: ' + error.message);
      } else {
        throw new Error(`Failed to check PDF hash on blockchain: ${error.message || 'Unknown error'}`);
      }
    }
  }

  async mintWithIssuerSig(
    userAddress: string,
    tokenURI: string,
    pdfHash: string,
    merkleRoot: string,
    finalDeadline: bigint,
    signature: string
  ): Promise<bigint | string> {
    try {
      debug.log('ContractService: Minting NFT with issuer sig:', signature);
      debug.log('ContractService: Contract address:', CONTRACT_ADDRESS);

      const hashBytes32 = ethers.getBytes(pdfHash);
      debug.log('ContractService: Hash as bytes32:', hashBytes32)

      debug.log('ContractService: Calling contract method...');
      const result = await this.contract.mintWithIssuerSig(
        userAddress,
        tokenURI,
        hashBytes32,
        merkleRoot,
        finalDeadline
      );
      debug.log('ContractService: Contract returned:', result);

      return result;
    } catch (error: any) {
      debug.error('ContractService: Error checking PDF hash:', error);
      
      // Provide more specific error information
      if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error: Unable to connect to blockchain');
      } else if (error.code === 'CALL_EXCEPTION') {
        throw new Error('Smart contract call failed: ' + error.reason);
      } else if (error.message?.includes('revert')) {
        throw new Error('Smart contract execution reverted: ' + error.message);
      } else {
        throw new Error(`Failed to check PDF hash on blockchain: ${error.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return CONTRACT_ADDRESS;
  }

  /**
   * Get network configuration
   */
  getNetworkConfig() {
    return NETWORK_CONFIG;
  }

  /**
   * Check if the current network is correct
   */
  async isCorrectNetwork(): Promise<boolean> {
    try {
      const network = await this.provider.getNetwork();
      const currentChainId = network.chainId.toString();
      const currentChainIdHex = '0x' + network.chainId.toString(16);
      
      debug.log('ContractService: Current network:', {
        name: network.name,
        chainId: currentChainId,
        chainIdHex: currentChainIdHex,
        expectedChainId: NETWORK_CONFIG.chainId
      });
      
      // Check if current chain ID matches any of the valid chain IDs
      const isValid = VALID_CHAIN_IDS.some(validId => {
        const validIdStr = validId.toString();
        const validIdHex = validIdStr.startsWith('0x') ? validIdStr : '0x' + parseInt(validIdStr).toString(16);
        
        return currentChainId === validIdStr || 
               currentChainIdHex === validIdHex ||
               currentChainId === validIdHex;
      });
      
      debug.log('ContractService: Network validation result:', isValid);
      return isValid;
    } catch (error) {
      debug.error('ContractService: Error checking network:', error);
      return false;
    }
  }

  /**
   * Request to switch to the correct network
   */
  async switchToCorrectNetwork(): Promise<void> {
    const ethereum = window.ethereum || window.talismanEth;
    
    if (!ethereum) {
      throw new Error('No Web3 provider found');
    }

    debug.log('ContractService: Attempting to switch to network:', NETWORK_CONFIG.chainName);

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainId }],
      });
      debug.log('ContractService: Successfully switched to network');
    } catch (switchError: any) {
      debug.log('ContractService: Switch failed, attempting to add network:', switchError);
      
      // This error code indicates that the chain has not been added to the wallet
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG],
          });
          debug.log('ContractService: Successfully added and switched to network');
        } catch (addError: any) {
          debug.error('ContractService: Failed to add network:', addError);
          throw new Error('Failed to add network to wallet: ' + addError.message);
        }
      } else {
        debug.error('ContractService: Network switch error:', switchError);
        throw new Error('Failed to switch network: ' + switchError.message);
      }
    }
  }
}
