import { ethers } from 'ethers';
import { debug } from '../utils/debug';
import { CONTRACT_ADDRESS } from '@/constants';

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
  },
  {
    "inputs":[{"internalType":"address","name":"owner","type":"address"}],
    "name":"balanceOf",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],
    "name":"tokenOfOwnerByIndex",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],
    "name":"tokenURI",
    "outputs":[{"internalType":"string","name":"","type":"string"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],
    "name":"ownerOf",
    "outputs":[{"internalType":"address","name":"","type":"address"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],
    "name":"pdfHashOf",
    "outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],
    "name":"rootOf",
    "outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[],
    "name":"owner",
    "outputs":[{"internalType":"address","name":"","type":"address"}],
    "stateMutability":"view",
    "type":"function"
  }
];

// Network configuration for Polkadot Paseo Passethub
const NETWORK_CONFIG = {
  chainId: '0x190f1b46', // 420 in decimal for Paseo Passethub
  name: 'Passet Hub',
  rpc: ['https://testnet-passet-hub-eth-rpc.polkadot.io/'],
  blockExplorer: ['https://blockscout-passet-hub.parity-testnet.parity.io/'],
};

// Alternative chain IDs that might be used for Paseo Passethub
const VALID_CHAIN_IDS = ['0x190f1b46', '420420422', 420420422];

export class ContractService {
  private readContract: ethers.Contract;
  private provider: ethers.BrowserProvider;

  constructor(provider: ethers.BrowserProvider) {
    this.provider = provider;
    this.readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
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
      const result = await this.readContract.isPdfHashUsed(hashBytes32);
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
  ): Promise<ethers.TransactionResponse> {
    try {
      const signer = await this.provider.getSigner();
      const write = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      await write.mintWithIssuerSig.staticCall(
        userAddress,
        tokenURI,
        pdfHash,
        merkleRoot,
        finalDeadline,
        signature
      );

      console.log("tokenURI:", tokenURI);

      const GAS_LIMIT = BigInt(500_000);
      const tx = await write.mintWithIssuerSig(
        userAddress,
        tokenURI,
        pdfHash,
        merkleRoot,
        finalDeadline,
        signature,
        { gasLimit: GAS_LIMIT }
      );
      debug.log('mintWithIssuerSig tx:', tx.hash);

      return tx;
    } catch (error: any) {
      const msg = String(error?.message || error?.shortMessage || '');

      if (/AuthExpired/i.test(msg))        throw new Error('Authorization expired. Please request a new signature.');
      if (/PdfAlreadyUsed/i.test(msg))     throw new Error('This certificate hash has already been minted.');
      if (/SigAlreadyUsed/i.test(msg))     throw new Error('This signature has already been used.');
      if (/InvalidIssuerSignature/i.test(msg))
        throw new Error('Issuer signature invalid. Ensure the backend signs with the contract owner key and the same chainId/address.');

      if (error?.code === 'CALL_EXCEPTION' && /estimateGas/i.test(msg)) {
        throw new Error('Transaction simulation failed (gas estimate). Usually this means the signature/domain or inputs don’t match the contract. Double-check chainId, contract address, and EIP-712 name/version.');
      }
      if (error?.code === 'UNSUPPORTED_OPERATION' && /sendTransaction/i.test(msg)) {
        throw new Error('Your wallet cannot send EVM txs on this network. Use an EVM provider (MetaMask / Talisman EVM) connected to Paseo.');
      }

      throw new Error(`Failed to send mint transaction: ${msg || 'Unknown error'}`);
    }
  }

  buildTxUrl(txHash: string): string | null {
    // Use Parity testnet Blockscout explorer
    const base = 'https://blockscout-passet-hub.parity-testnet.parity.io';
    return `${base}/tx/${txHash}`;
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

    debug.log('ContractService: Attempting to switch to network:', NETWORK_CONFIG.name);

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

  /**
   * Get the number of tokens owned by an address
   */
  async balanceOf(owner: string): Promise<number> {
    try {
      debug.log('ContractService: Getting balance for owner:', owner);
      const balance = await this.readContract.balanceOf(owner);
      debug.log('ContractService: Balance:', balance.toString());
      return Number(balance);
    } catch (error: any) {
      debug.error('ContractService: Error getting balance:', error);
      throw new Error(`Failed to get balance: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get token ID owned by an address at a specific index
   */
  async tokenOfOwnerByIndex(owner: string, index: number): Promise<number> {
    try {
      debug.log('ContractService: Getting token at index:', index, 'for owner:', owner);
      const tokenId = await this.readContract.tokenOfOwnerByIndex(owner, index);
      debug.log('ContractService: Token ID:', tokenId.toString());
      return Number(tokenId);
    } catch (error: any) {
      debug.error('ContractService: Error getting token by index:', error);
      throw new Error(`Failed to get token by index: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get the token URI for a specific token ID
   */
  async tokenURI(tokenId: number): Promise<string> {
    try {
      debug.log('ContractService: Getting token URI for token ID:', tokenId);
      const uri = await this.readContract.tokenURI(tokenId);
      debug.log('ContractService: Token URI:', uri);
      return uri;
    } catch (error: any) {
      debug.error('ContractService: Error getting token URI:', error);
      throw new Error(`Failed to get token URI: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get the owner of a specific token ID
   */
  async ownerOf(tokenId: number): Promise<string> {
    try {
      debug.log('ContractService: Getting owner for token ID:', tokenId);
      const owner = await this.readContract.ownerOf(tokenId);
      debug.log('ContractService: Owner:', owner);
      return owner;
    } catch (error: any) {
      debug.error('ContractService: Error getting owner:', error);
      throw new Error(`Failed to get owner: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get the PDF hash for a specific token ID
   */
  async pdfHashOf(tokenId: number): Promise<string> {
    try {
      debug.log('ContractService: Getting PDF hash for token ID:', tokenId);
      const pdfHash = await this.readContract.pdfHashOf(tokenId);
      debug.log('ContractService: PDF hash:', pdfHash);
      return pdfHash;
    } catch (error: any) {
      debug.error('ContractService: Error getting PDF hash:', error);
      throw new Error(`Failed to get PDF hash: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get the merkle root for a specific token ID
   */
  async rootOf(tokenId: number): Promise<string> {
    try {
      debug.log('ContractService: Getting merkle root for token ID:', tokenId);
      const merkleRoot = await this.readContract.rootOf(tokenId);
      debug.log('ContractService: Merkle root:', merkleRoot);
      return merkleRoot;
    } catch (error: any) {
      debug.error('ContractService: Error getting merkle root:', error);
      throw new Error(`Failed to get merkle root: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get all tokens owned by a specific address
   */
  async getUserTokens(owner: string): Promise<number[]> {
    try {
      debug.log('ContractService: Getting all tokens for owner:', owner);
      const balance = await this.balanceOf(owner);
      const tokens: number[] = [];
      
      for (let i = 0; i < balance; i++) {
        const tokenId = await this.tokenOfOwnerByIndex(owner, i);
        tokens.push(tokenId);
      }
      
      debug.log('ContractService: Found tokens:', tokens);
      return tokens;
    } catch (error: any) {
      debug.error('ContractService: Error getting user tokens:', error);
      throw new Error(`Failed to get user tokens: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get the contract owner (issuer) address
   * The issuer is the address that deployed the contract and has permission to mint certificates
   */
  async getIssuer(): Promise<string> {
    try {
      debug.log('ContractService: Getting contract owner (issuer)');
      const issuer = await this.readContract.owner();
      debug.log('ContractService: Issuer address:', issuer);
      return issuer;
    } catch (error: any) {
      debug.error('ContractService: Error getting issuer:', error);
      throw new Error(`Failed to get issuer: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Check if a given contract address is the CertifaPro contract
   */
  isCertifaProContract(contractAddress: string): boolean {
    return contractAddress.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
  }

  /**
   * Verify if an NFT token belongs to the CertifaPro contract
   * This is useful for external verification of NFT authenticity
   * 
   * Example usage:
   * const verification = await contractService.verifyCertifaProNFT(6);
   * if (verification.isCertifaPro && verification.tokenExists) {
   *   console.log('This is a valid CertifaPro NFT!');
   * }
   */
  async verifyCertifaProNFT(tokenId: number, contractAddress?: string): Promise<{
    isCertifaPro: boolean;
    contractAddress: string;
    tokenExists: boolean;
    owner?: string;
  }> {
    try {
      const targetContractAddress = contractAddress || CONTRACT_ADDRESS;
      const isCertifaPro = this.isCertifaProContract(targetContractAddress);
      
      let tokenExists = false;
      let owner: string | undefined;

      if (isCertifaPro) {
        try {
          owner = await this.ownerOf(tokenId);
          tokenExists = true;
        } catch (error) {
          // Token doesn't exist or error occurred
          tokenExists = false;
        }
      }

      return {
        isCertifaPro,
        contractAddress: targetContractAddress,
        tokenExists,
        owner
      };
    } catch (error: any) {
      debug.error('ContractService: Error verifying CertifaPro NFT:', error);
      throw new Error(`Failed to verify NFT: ${error.message || 'Unknown error'}`);
    }
  }
}
