import React, { useState } from 'react';
import { Search, ExternalLink, Calendar, FileText, Filter } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface Certificate {
  id: string;
  title: string;
  tokenId: string;
  issuedDate: string;
  hash: string;
  verified: boolean;
}

export const AllCertificatesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending'>('all');

  // Dummy data
  const certificates: Certificate[] = [
    {
      id: '1',
      title: 'Bachelor\'s Degree in Computer Science',
      tokenId: '1234567890',
      issuedDate: '15/05/2023',
      hash: '0x742d35Cc6634C0532925a3b8448c9e7595f0bE',
      verified: true
    },
    {
      id: '2',
      title: 'Professional Web Development Certificate',
      tokenId: '1234567891',
      issuedDate: '20/01/2024',
      hash: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      verified: true
    },
    {
      id: '3',
      title: 'Advanced Blockchain Development',
      tokenId: '1234567892',
      issuedDate: '10/03/2024',
      hash: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      verified: true
    },
    {
      id: '4',
      title: 'Machine Learning Fundamentals',
      tokenId: '1234567893',
      issuedDate: '05/06/2024',
      hash: '0x3Cd3CaDbD9735AFf958023239c6A0638f3Cf7ad2',
      verified: false
    },
    {
      id: '5',
      title: 'Cloud Architecture Certification',
      tokenId: '1234567894',
      issuedDate: '12/08/2024',
      hash: '0x5AFf958023239c6A0638f3Cf7ad23Cd3CaDbD97',
      verified: true
    },
    {
      id: '6',
      title: 'Cybersecurity Essentials',
      tokenId: '1234567895',
      issuedDate: '18/09/2024',
      hash: '0x239c6A0638f3Cf7ad23Cd3CaDbD9735AFf95802',
      verified: false
    }
  ];

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'verified' && cert.verified) ||
      (filterStatus === 'pending' && !cert.verified);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            My{' '}
            <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
              Certificates
            </span>
          </h1>
          <p className="text-xl text-gray-300">
            View and manage your verified certificates
          </p>
        </div>

        {/* Search and Filter Bar */}
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

        {/* Certificates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((certificate) => (
            <Card key={certificate.id} hover className="relative">
              {/* Verification Badge */}
              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    certificate.verified
                      ? 'bg-gradient-to-r from-purple-500 to-teal-500 text-white'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}
                >
                  {certificate.verified ? 'Verified' : 'Pending'}
                </span>
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

              {/* Issued Date */}
              <div className="flex items-center mb-3">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-400">Issued:</span>
                <span className="text-sm text-white ml-1">{certificate.issuedDate}</span>
              </div>

              {/* Blockchain Hash */}
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-1">Hash:</p>
                <p className="text-white font-mono text-xs break-all">
                  {certificate.hash}
                </p>
              </div>

              {/* Action Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full group"
                disabled={!certificate.verified}
              >
                View on Explorer
                <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredCertificates.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No certificates found' : 'No certificates yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload and verify your first certificate to get started'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button>
                Mint Your First Certificate
              </Button>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {certificates.length}
            </div>
            <div className="text-gray-400">Total Certificates</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {certificates.filter(c => c.verified).length}
            </div>
            <div className="text-gray-400">Verified</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {certificates.filter(c => !c.verified).length}
            </div>
            <div className="text-gray-400">Pending</div>
          </Card>
        </div>
      </div>
    </div>
  );
};
