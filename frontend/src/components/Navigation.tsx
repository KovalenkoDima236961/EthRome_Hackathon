import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, Shield } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Button } from './ui/Button';
import { ThemeToggle } from './ThemeToggle';

export const Navigation: React.FC = () => {
  const { account, isConnected, connectWallet, isLoading, error, clearError } = useWeb3();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;



  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">CertifyChain</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/") ? "text-primary" : "text-foreground"
                }`}
              >
                Home
              </Link>
              <Link
                to="/mint"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/mint") ? "text-primary" : "text-foreground"
                }`}
              >
                Mint Certificate
              </Link>
              <Link
                to="/certificates"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/certificates") ? "text-primary" : "text-foreground"
                }`}
              >
                My Certificates
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <Button 
                    variant="glass" 
                    size="default" 
                    className="gap-2"
                    onClick={connectWallet}
                    disabled={isLoading}
                  >
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {isLoading ? 'Connecting...' : isConnected ? `${account?.slice(0, 6)}...${account?.slice(-4)}` : 'Connect Wallet'}
                    </span>
                  </Button>
                  {/* {isConnected && networkName && (
                    <span className="text-xs text-muted-foreground mt-1">
                      {networkName}
                    </span>
                  )} */}
                </div>
                {/* {isConnected && (
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    title="Refresh connection"
                  >
                    Refresh
                  </button>
                )} */}
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
