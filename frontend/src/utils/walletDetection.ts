export interface WalletInfo {
  name: string;
  available: boolean;
  provider: any;
}

export const detectWallets = (): WalletInfo[] => {
  const wallets: WalletInfo[] = [];

  // Check for MetaMask
  if (window.ethereum?.isMetaMask) {
    wallets.push({
      name: 'MetaMask',
      available: true,
      provider: window.ethereum
    });
  }

  // Check for Talisman
  if (window.talismanEth) {
    wallets.push({
      name: 'Talisman',
      available: true,
      provider: window.talismanEth
    });
  }

  // Check for generic ethereum provider
  if (window.ethereum && !window.ethereum.isMetaMask) {
    wallets.push({
      name: 'Generic Ethereum Provider',
      available: true,
      provider: window.ethereum
    });
  }

  return wallets;
};

export const getPreferredWallet = (): WalletInfo | null => {
  const wallets = detectWallets();
  
  // Prefer Talisman if available, otherwise MetaMask, otherwise first available
  const talisman = wallets.find(w => w.name === 'Talisman');
  if (talisman) return talisman;
  
  const metamask = wallets.find(w => w.name === 'MetaMask');
  if (metamask) return metamask;
  
  return wallets[0] || null;
};
