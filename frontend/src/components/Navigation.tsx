import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Wallet, Shield } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useWeb3 } from '../contexts/Web3Context';
import { Button } from './Button';

export const Navigation: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { account, isConnected, connectWallet, isLoading, error, clearError, provider } = useWeb3();
  const location = useLocation();
  const [networkName, setNetworkName] = useState<string>('');

  useEffect(() => {
    const checkNetwork = async () => {
      if (provider && isConnected) {
        try {
          const network = await provider.getNetwork();
          setNetworkName(network.name || `Chain ${network.chainId}`);
        } catch (err) {
          setNetworkName('Unknown');
        }
      } else {
        setNetworkName('');
      }
    };
    checkNetwork();
  }, [provider, isConnected]);

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/mint', label: 'Mint Certificate' },
    { path: '/certificates', label: 'My Certificates' },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">CertifyChain</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  location.pathname === item.path
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors duration-200"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-end">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={connectWallet}
                  disabled={isLoading}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {isLoading ? 'Connecting...' : isConnected ? `${account?.slice(0, 6)}...${account?.slice(-4)}` : 'Connect Wallet'}
                </Button>
                {isConnected && networkName && (
                  <span className="text-xs text-gray-400 mt-1">
                    {networkName}
                  </span>
                )}
              </div>
              {isConnected && (
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-gray-400 hover:text-white underline"
                  title="Refresh connection"
                >
                  Refresh
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
    
    {/* Error Display */}
    {error && (
      <div className="fixed top-16 left-0 right-0 z-40 bg-red-500/10 border-b border-red-500/30 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    )}
    </>
  );
};
