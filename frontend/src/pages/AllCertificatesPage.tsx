import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, FileText, Filter, Unlock, Copy, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/Card';
import { useWeb3 } from '../contexts/Web3Context';
import { ContractService } from '../services/contractService';
import { Alert } from '../components/Alert';
import { deriveSymmetricKeyFromWallet, decryptData } from '@/utils/cryptographyUtils';

interface Certificate {
  id: string;
  title: string;
  tokenId: string;
  issuedDate?: string;
  hash: string;
  verified: boolean;
  tokenURI?: string;
  merkleRoot?: string;
  issuer?: string;
  contractAddress?: string;
  isCertifaPro?: boolean;
}

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
  properties?: {
    encrypted_pdf?: string;
    encrypted_fields?: string;
    merkle_root?: string;
    merkle_version?: number;
  }
}

const ipfsToHttp = (uri: string): string =>
  uri.startsWith('ipfs://') ? uri.replace('ipfs://', 'http://127.0.0.1:8080/ipfs/') : uri;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;


export const AllCertificatesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending'>('all');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decryptedMap, setDecryptedMap] = useState<Record<string, unknown>>({});
  const [openTokenId, setOpenTokenId] = useState<string | null>(null);

  const { account, provider, isConnected } = useWeb3();

  // Helper function to format address (shorten it)
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Reusable CertifaPro spinner component
  const CertifaProSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8', 
      lg: 'w-16 h-16'
    };

    return (
      <div className={`${sizeClasses[size]} relative flex items-center justify-center`}>
        {/* Outer rotating ring with slower animation */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-purple-500/20"
          style={{ animation: 'spin 3s linear infinite' }}
        >
          <div 
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500"
            style={{ animation: 'spin 3s linear infinite' }}
          ></div>
        </div>
        
        {/* Orbiting purple dots */}
        {size === 'lg' && (
          <div className="absolute inset-0">
            {/* Top dot */}
            <div 
              className="w-1.5 h-1.5 bg-purple-400 rounded-full absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 animate-ping opacity-70"
              style={{ animationDelay: '0s' }}
            ></div>
            {/* Right dot */}
            <div 
              className="w-1.5 h-1.5 bg-purple-400 rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 animate-ping opacity-60"
              style={{ animationDelay: '0.5s' }}
            ></div>
            {/* Bottom dot */}
            <div 
              className="w-1.5 h-1.5 bg-purple-400 rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 animate-ping opacity-50"
              style={{ animationDelay: '1s' }}
            ></div>
            {/* Left dot */}
            <div 
              className="w-1.5 h-1.5 bg-purple-400 rounded-full absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 animate-ping opacity-40"
              style={{ animationDelay: '1.5s' }}
            ></div>
            {/* Additional corner dots */}
            <div 
              className="w-1 h-1 bg-purple-300 rounded-full absolute top-2 right-2 animate-ping opacity-30"
              style={{ animationDelay: '2s' }}
            ></div>
            <div 
              className="w-1 h-1 bg-purple-300 rounded-full absolute bottom-2 left-2 animate-ping opacity-30"
              style={{ animationDelay: '2.5s' }}
            ></div>
          </div>
        )}
      </div>
    );
  };

  // Function to fetch NFT metadata from IPFS
  const fetchMetadata = async (tokenURI: string): Promise<NFTMetadata | null> => {
    try {
      // Handle IPFS URLs
      let url = tokenURI;
      if (tokenURI.startsWith('ipfs://')) {
        url = `https://ipfs.io/ipfs/${tokenURI.slice(7)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching metadata:', error);
      return null;
    }
  };

  // Function to fetch user's certificates from the smart contract
  const fetchUserCertificates = async () => {
    if (!account || !provider || !isConnected) {
      setCertificates([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contractService = new ContractService(provider);
      const [tokenIds, issuer, contractAddress] = await Promise.all([
        contractService.getUserTokens(account),
        contractService.getIssuer(),
        Promise.resolve(contractService.getContractAddress())
      ]);
      
      const certificatePromises = tokenIds.map(async (tokenId) => {
        try {
          const [tokenURI, pdfHash, merkleRoot] = await Promise.all([
            contractService.tokenURI(tokenId),
            contractService.pdfHashOf(tokenId),
            contractService.rootOf(tokenId)
          ]);

          const metadata = await fetchMetadata(tokenURI);
          
          // Extract title from metadata or use a default
          const title = metadata?.name || `Certificate #${tokenId}`;
          
          // For now, we'll consider all NFTs as verified since they're minted through the contract
          // In the future, you might want to add additional verification logic
          const verified = true;

          return {
            id: tokenId.toString(),
            title,
            tokenId: tokenId.toString(),
            hash: pdfHash,
            verified,
            tokenURI,
            merkleRoot,
            issuer,
            contractAddress,
            isCertifaPro: contractService.isCertifaProContract(contractAddress)
          } as Certificate;
        } catch (error) {
          console.error(`Error fetching data for token ${tokenId}:`, error);
          return null;
        }
      });

      const certificates = (await Promise.all(certificatePromises)).filter(Boolean) as Certificate[];
      setCertificates(certificates);
    } catch (error: any) {
      console.error('Error fetching certificates:', error);
      setError(`Failed to load certificates: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch certificates when component mounts or when account changes
  useEffect(() => {
    fetchUserCertificates();
  }, [account, provider, isConnected]);

  const decryptCertificate = async (cert: Certificate): Promise<void> => {
    if (!cert.tokenURI) {
      console.error('No tokenURI found for certificate', cert.tokenId);
      return;
    }
    try {
      const metaUrl = ipfsToHttp(cert.tokenURI);
      const metaResp = await fetch(metaUrl);
      
      if (!metaResp.ok) throw new Error(`Failed to fetch metadata: ${metaResp.status} ${metaResp.statusText}`);
      const metadata: NFTMetadata = await metaResp.json();

      const encryptedFieldsIpfs = metadata.properties?.encrypted_fields;
      if (!encryptedFieldsIpfs || typeof encryptedFieldsIpfs !== 'string') {
        throw new Error('Metadata.properties.encrypted_fields is missing');
      }

      const encUrl = ipfsToHttp(encryptedFieldsIpfs);
      const encResp = await fetch(encUrl);
      if (!encResp.ok) throw new Error(`Failed to fetch encrypted fields: ${encResp.status} ${encResp.statusText}`);
      const encryptedBytes = new Uint8Array(await encResp.arrayBuffer());

      if (!provider) throw new Error('Wallet provider not available');

      const key = await deriveSymmetricKeyFromWallet(provider);
      const decryptedBytes = decryptData(encryptedBytes, key);
      const rawText = new TextDecoder('utf-8').decode(decryptedBytes);

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error('Failed to parse decrypted JSON: ' + msg);
      }
      if (!isRecord(parsed)) {
        throw new Error('Decrypted payload is not a JSON object');
      }

      setDecryptedMap(prev => ({...prev, [cert.tokenId]: parsed }));
      setOpenTokenId(cert.tokenId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Failed to decrypt certificate:', msg);
      alert('Failed to decrypt: ' + msg);
    }
  }

  const formatLabel = (key: string): string => {
    const cleaned = key.replace(/^__+/, '').replace(/[_-]+/g, ' ').trim();
    return cleaned.replace(/\b\w/g, (m) => m.toUpperCase());
  };

  const isLikelyIdOrHash = (k: string, v: unknown): boolean => {
    if (typeof v !== 'string') return false;
    return /(id|hash|tx|address)/i.test(k) || v.length > 42;
  };


  const renderDecryptedFields = (data: unknown): React.ReactNode => {
    if (!isRecord(data)) return null;
    const entries = Object
      .entries(data as Record<string, unknown>)
      .filter(([k]) => !k.startsWith('__'))
      .filter(([k]) => k.toLowerCase() !== 'certificate_ipfs_url');
    if (entries.length === 0)
      return <p className="text-gray-300 text-sm">No public fields to display.</p>;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {entries.map(([key, value]) => {
          const label = formatLabel(key);
          const isSimple = ['string', 'number', 'boolean'].includes(typeof value);
          const isIpfs = typeof value === 'string' && value.startsWith('ipfs://');
          const isLong = isLikelyIdOrHash(key, value);

          return (
            <div
              key={key}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:bg-white/[0.07] transition-colors"
            >
              <p className="text-[11px] font-medium tracking-wider text-gray-400 mb-2">
                {label}
              </p>

              {isSimple ? (
                isIpfs ? (
                  <button
                    onClick={() => window.open(ipfsToHttp(String(value)), '_blank')}
                    className={`text-sm break-words text-purple-300 hover:text-purple-200 underline ${isLong ? 'font-mono' : ''} rounded-md shadow-sm`}
                    title="Open on IPFS gateway"
                  >
                    {String(value)}
                  </button>
                ) : (
                  <p className={`text-sm break-words text-white ${isLong ? 'font-mono' : ''}`}>
                    {String(value)}
                  </p>
                )
              ) : (
                <pre className="text-xs text-gray-300 overflow-auto max-h-48 whitespace-pre-wrap break-words">{JSON.stringify(value, null, 2)}</pre>
              )}
            </div>
          );
        })}
      </div>
    );
  };


  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'verified' && cert.verified) ||
      (filterStatus === 'pending' && !cert.verified);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen hero-bg relative overflow-hidden pt-24 pb-16">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-glow opacity-50" />
      
      {/* Floating Polkadot Dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="polkadot-dot absolute top-1/4 left-1/4 animate-float" style={{ animationDelay: '0s' }} />
        <div className="polkadot-dot absolute top-1/3 right-1/4 animate-float" style={{ animationDelay: '1s' }} />
        <div className="polkadot-dot absolute bottom-1/3 left-1/3 animate-float" style={{ animationDelay: '2s' }} />
        <div className="polkadot-dot absolute top-2/3 right-1/3 animate-float" style={{ animationDelay: '3s' }} />
        <div className="polkadot-dot absolute bottom-1/4 right-1/2 animate-float" style={{ animationDelay: '4s' }} />
        <div className="polkadot-dot absolute top-1/2 left-1/6 animate-float" style={{ animationDelay: '5s' }} />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">My </span>
            <span 
              className="inline-block text-transparent bg-clip-text animate-gradient"
              style={{
                backgroundImage: 'linear-gradient(to right, #a855f7, #14b8a6, #a855f7)',
                backgroundSize: '300% 100%',
                animationDuration: '3s',
                WebkitBackgroundClip: 'text'
              }}
            >
              Certificates
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            View and manage your verified certificates
          </p>
          
          {/* Connection Status and Refresh Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isConnected && (
              <Alert 
                type="warning" 
                title="Wallet Not Connected"
                message="Please connect your wallet to view your certificates"
                className="max-w-md"
              />
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8">
            <Alert 
              type="error" 
              title="Error Loading Certificates"
              message={error}
              className="max-w-2xl mx-auto"
            />
          </div>
        )}

        {/* Search and Filter Bar */}
        {isConnected && (
        <div className="mb-8">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search certificates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              {/* Filter Dropdown */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'verified' | 'pending')}
                  className="pl-10 pr-8 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="all">All Certificates</option>
                  <option value="verified">Verified Only</option>
                  <option value="pending">Pending Only</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
        )}

        {/* Certificates Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              {/* Single CertifaPro Spinner */}
              <div className="mb-6 flex justify-center">
                <CertifaProSpinner size="md" />
              </div>
              
              <p className="text-gray-300 text-lg font-medium mb-2">Loading CertifaPro Certificates</p>
              <p className="text-gray-400 text-sm mb-4">Fetching your verified certificates from the blockchain...</p>
              
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((certificate) => (
            <Card key={certificate.id} hover className="relative">
              {/* Verification Badge */}
              <div className="absolute top-4 right-4 flex flex-col gap-1">
                {/* CertifaPro Badge */}
                {certificate.isCertifaPro && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    Verified
                </span>
                )}
              </div>

              {/* Certificate Icon */}
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-white" />
              </div>

              {/* Certificate Title */}
              <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                {certificate.title}
              </h3>

              {/* NFT Token ID */}
              <div className="mb-3">
                <p className="text-sm text-gray-400">NFT Token #</p>
                <p className="text-white font-mono text-sm">{certificate.tokenId}</p>
              </div>

              {/* Issuer */}
              {certificate.issuer && (
                <div className="mb-3">
                  <p className="text-sm text-gray-400 mb-1">Issuer:</p>
                  <button
                    onClick={() => {
                      const explorerUrl = `https://blockscout-passet-hub.parity-testnet.parity.io/address/${certificate.issuer}`;
                      window.open(explorerUrl, '_blank');
                    }}
                    className="text-white font-mono text-xs break-all cursor-pointer hover:text-purple-400 transition-colors"
                    title={`View issuer on explorer: ${certificate.issuer}`}
                  >
                    {formatAddress(certificate.issuer)}
                  </button>
                </div>
              )}

              {/* Contract Address */}
              {certificate.contractAddress && (
                <div className="mb-3">
                  <p className="text-sm text-gray-400 mb-1">Contract:</p>
                  <button
                    onClick={() => {
                      const explorerUrl = `https://blockscout-passet-hub.parity-testnet.parity.io/address/${certificate.contractAddress}`;
                      window.open(explorerUrl, '_blank');
                    }}
                    className="text-white font-mono text-xs break-all cursor-pointer hover:text-purple-400 transition-colors"
                    title={`View contract on explorer: ${certificate.contractAddress}`}
                  >
                    {formatAddress(certificate.contractAddress)}
                  </button>
                  {certificate.isCertifaPro && (
                    <span className="ml-2 text-xs text-green-400 font-semibold">
                      ✓ CertifaPro
                    </span>
                  )}
                </div>
              )}

              {/* Blockchain Hash */}
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-1">Hash:</p>
                <p className="text-white font-mono text-xs break-all">
                  {certificate.hash}
                </p>
              </div>

              {openTokenId === certificate.tokenId && decryptedMap[certificate.tokenId] !== undefined && (
                <div className="mb-4 rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-purple-300">Decrypted Fields</h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 py-1 text-xs border-gray-700/70 bg-gray-800/50 text-gray-200 hover:bg-gray-800"
                        onClick={async () => {
                          const json = JSON.stringify(decryptedMap[certificate.tokenId], null, 2);
                          try {
                            await navigator.clipboard.writeText(json);
                          } catch (_) {}
                        }}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 py-1 text-xs border-gray-700/70 bg-gray-800/50 text-gray-200 hover:bg-gray-800"
                        onClick={() => {
                          setOpenTokenId(null);
                          setDecryptedMap(prev => {
                            const { [certificate.tokenId]: _removed, ...rest } = prev;
                            return rest;
                          });
                        }}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Hide
                      </Button>
                    </div>
                  </div>
                  {renderDecryptedFields(decryptedMap[certificate.tokenId])}
                </div>
              )}


              {/* Action Buttons */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  size="sm"
                  disabled={decryptedMap[certificate.tokenId] !== undefined}
                  className={`w-full relative overflow-hidden rounded-lg px-4 py-2 font-medium bg-gradient-to-r from-purple-600 to-indigo-500 text-white shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/60 ${decryptedMap[certificate.tokenId] !== undefined ? 'opacity-60 cursor-not-allowed hover:shadow-none' : 'hover:shadow-purple-500/25'}`}
                  onClick={() => {
                    if (decryptedMap[certificate.tokenId] !== undefined) return;
                    decryptCertificate(certificate);
                  }}
                >
                  <span className="inline-flex items-center justify-center">
                    <Unlock className="w-4 h-4 mr-2" />
                    {decryptedMap[certificate.tokenId] !== undefined ? 'Decrypted ✓' : 'Decrypt'}
                  </span>
                  <span className="absolute inset-0 opacity-0 hover:opacity-20 bg-white transition-opacity" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full group rounded-lg border border-gray-700/70 bg-gray-800/50 text-gray-200 hover:bg-gray-800 hover:border-gray-600 transition-all"
                  disabled={!certificate.verified}
                  onClick={() => {
                    const contractService = new ContractService(provider!);
                    const explorerUrl = `https://blockscout-passet-hub.parity-testnet.parity.io/token/${contractService.getContractAddress()}/instance/${certificate.tokenId}`;
                    window.open(explorerUrl, '_blank');
                  }}
                >
                  <span className="inline-flex items-center justify-center">
                    View on Explorer
                    <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredCertificates.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {!isConnected 
                ? 'Connect your wallet to view certificates'
                : searchTerm || filterStatus !== 'all' 
                  ? 'No certificates found' 
                  : 'No certificates yet'
              }
            </h3>
            <p className="text-gray-500 mb-6">
              {!isConnected
                ? 'Connect your wallet to see your NFT certificates'
                : searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload and verify your first certificate to get started'
              }
            </p>
            {!isConnected ? (
              <Button onClick={() => window.location.href = '/'}>
                Connect Wallet
              </Button>
            ) : !searchTerm && filterStatus === 'all' && (
              <Button onClick={() => window.location.href = '/mint'}>
                Mint Your First Certificate
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
