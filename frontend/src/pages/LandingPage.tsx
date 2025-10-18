import React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Shield, Tag, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export const LandingPage: React.FC = () => {
  const features = [
    {
      icon: <Upload className="w-8 h-8" />,
      title: 'Upload Certificate',
      description: 'Upload your PDF certificate to our secure platform.'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Verify on Chain',
      description: 'Our system generates a hash and verifies it on the blockchain.'
    },
    {
      icon: <Tag className="w-8 h-8" />,
      title: 'Mint NFT',
      description: 'Receive a unique NFT as permanent proof of ownership.'
    }
  ];

  const benefits = [
    {
      title: 'Immutable Records',
      description: 'Your certificates are permanently stored on the blockchain, making them tamper-proof and verifiable forever.'
    },
    {
      title: 'True Ownership',
      description: 'NFT minting gives you provable ownership of your achievements, transferable and tradeable.'
    },
    {
      title: 'Instant Verification',
      description: 'Anyone can verify your certificate\'s authenticity in seconds using blockchain technology.'
    },
    {
      title: 'Future-Proof',
      description: 'Built on decentralized technology that ensures your records survive independently of any single entity.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Upload. Verify.{' '}
            <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
              Own.
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Turn your certificates into verifiable, blockchain-backed NFTs. Permanent proof of ownership and authenticity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="group">
              Get Started
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              How It{' '}
              <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="text-xl text-gray-300">
              Three simple steps to secure your certificates on the blockchain
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} hover className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-teal-500 rounded-xl flex items-center justify-center text-white mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
                <div className="absolute top-4 right-4 text-6xl font-bold text-gray-700 opacity-20">
                  {String(index + 1).padStart(2, '0')}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Web3 Verification Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why{' '}
              <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
                Web3 Verification?
              </span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                  <p className="text-gray-400">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-gradient-to-r from-purple-500/20 to-teal-500/20 border-purple-500/30">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Secure Your Certificates?
            </h2>
            <p className="text-gray-300 mb-8">
              Join thousands of professionals who trust CertifyChain for their certificate verification needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/mint">
                <Button size="lg" className="group">
                  Start Minting
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/certificates">
                <Button variant="outline" size="lg">
                  View Examples
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};
