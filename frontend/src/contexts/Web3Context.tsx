import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { getPreferredWallet } from '../utils/walletDetection';
import { debug } from '../utils/debug';

interface Web3ContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  clearError: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Get preferred wallet
      const wallet = getPreferredWallet();
      
      if (!wallet) {
        setError('Please install MetaMask or Talisman wallet');
        return;
      }

      debug.log('Connecting to wallet:', wallet.name);

      // Create provider
      const provider = new ethers.BrowserProvider(wallet.provider);
      
      // For Talisman, we need to handle the popup window differently
      if (wallet.name === 'Talisman') {
        console.log('Detected Talisman wallet, using special handling');
        
        // Check if already connected first
        const existingAccounts = await provider.send('eth_accounts', []);
        if (existingAccounts.length > 0) {
          console.log('Already connected to Talisman');
          const signer = await provider.getSigner();
          setProvider(provider);
          setSigner(signer);
          setAccount(existingAccounts[0]);
          setIsConnected(true);
          setError(null);
          return;
        }
        
        // Request connection with timeout
        const connectionPromise = provider.send('eth_requestAccounts', []);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 30000)
        );
        
        const accounts = await Promise.race([connectionPromise, timeoutPromise]) as string[];
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          setProvider(provider);
          setSigner(signer);
          setAccount(accounts[0]);
          setIsConnected(true);
          setError(null);
          console.log('Successfully connected to Talisman');
        } else {
          setError('No accounts found. Please unlock your wallet.');
        }
      } else {
        // Standard connection for other wallets
        const accounts = await provider.send('eth_requestAccounts', []);
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          setProvider(provider);
          setSigner(signer);
          setAccount(accounts[0]);
          setIsConnected(true);
          setError(null);
          debug.log('Successfully connected to wallet:', wallet.name);
        } else {
          setError('No accounts found. Please unlock your wallet.');
        }
      }
    } catch (error: any) {
      debug.error('Error connecting wallet:', error);
      
      // Handle specific error cases
      if (error.code === 4001) {
        setError('User rejected the connection request');
      } else if (error.code === -32002) {
        setError('Connection request already pending. Please check your wallet.');
      } else if (error.message?.includes('User rejected')) {
        setError('Connection was rejected. Please try again.');
      } else if (error.message?.includes('timeout')) {
        setError('Connection timed out. Please try again.');
      } else {
        setError(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  // Check if already connected on page load
  useEffect(() => {
    const checkConnection = async () => {
      const wallet = getPreferredWallet();
      
      if (wallet) {
        try {
          console.log('Checking connection with wallet:', wallet.name);
          const provider = new ethers.BrowserProvider(wallet.provider);
          const accounts = await provider.send('eth_accounts', []);
          
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            setProvider(provider);
            setSigner(signer);
            setAccount(accounts[0]);
            setIsConnected(true);
            console.log('Auto-connected to wallet:', wallet.name);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  // Listen for account changes and connection events
  useEffect(() => {
    const wallet = getPreferredWallet();
    
    if (wallet) {
      const handleAccountsChanged = (accounts: string[]) => {
        debug.log('Accounts changed:', accounts);
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
          // If we're not connected but have accounts, try to connect
          if (!isConnected && accounts.length > 0) {
            debug.log('Auto-connecting after account change');
            connectWallet();
          }
        }
      };

      const handleConnect = (connectInfo: any) => {
        debug.log('Wallet connected:', connectInfo);
        // Try to get accounts after connection
        setTimeout(() => {
          connectWallet();
        }, 1000);
      };

      const handleDisconnect = () => {
        debug.log('Wallet disconnected');
        disconnectWallet();
      };

      wallet.provider.on('accountsChanged', handleAccountsChanged);
      wallet.provider.on('connect', handleConnect);
      wallet.provider.on('disconnect', handleDisconnect);
      
      return () => {
        wallet.provider.removeListener('accountsChanged', handleAccountsChanged);
        wallet.provider.removeListener('connect', handleConnect);
        wallet.provider.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [isConnected]);

  const value: Web3ContextType = {
    account,
    provider,
    signer,
    isConnected,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    clearError,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
    talismanEth?: any;
  }
}
