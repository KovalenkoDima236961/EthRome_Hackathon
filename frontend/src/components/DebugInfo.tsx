import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { detectWallets } from '../utils/walletDetection';

export const DebugInfo: React.FC = () => {
  const { account, isConnected, isLoading, error, provider } = useWeb3();
  const [wallets, setWallets] = useState<any[]>([]);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);

  useEffect(() => {
    const detectedWallets = detectWallets();
    setWallets(detectedWallets);
  }, []);

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = `${timestamp}: ${isConnected ? 'Connected' : 'Disconnected'} - ${account || 'No account'}`;
    setConnectionLog(prev => [...prev.slice(-4), newLog]);
  }, [isConnected, account]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg text-xs text-white max-w-xs z-50 max-h-96 overflow-y-auto">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
        <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
        <p>Account: {account || 'None'}</p>
        <p>Provider: {provider ? 'Available' : 'None'}</p>
        <p>Error: {error || 'None'}</p>
        <p>Window.ethereum: {window.ethereum ? 'Yes' : 'No'}</p>
        <p>Window.talismanEth: {window.talismanEth ? 'Yes' : 'No'}</p>
        
        <div className="mt-2">
          <p className="font-semibold">Detected Wallets:</p>
          {wallets.map((wallet, index) => (
            <p key={index} className="ml-2">
              {wallet.name}: {wallet.available ? 'Available' : 'Not Available'}
            </p>
          ))}
        </div>

        <div className="mt-2">
          <p className="font-semibold">Connection Log:</p>
          {connectionLog.map((log, index) => (
            <p key={index} className="ml-2 text-xs opacity-75">
              {log}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};
