import { ArrowRight, Upload, Shield, Award, FileCheck, Network, Hexagon } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Navigation } from "../components/Navigation";
import { Link } from "react-router-dom";
import GradientText from "../components/GradientText";
import Aurora from "../components/Aurora";
import LogoLoop from "../components/LogoLoop";
import { SiAmazon, SiCoursera, SiUdemy, SiCisco } from 'react-icons/si';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-50" />
        <div className="absolute inset-0 opacity-30">
          <Aurora
            colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
            blend={0.5}
            amplitude={3.0}
            speed={1.0}
            className="w-full h-full"
          />
        </div>
        {/* Fade out gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />
        
        {/* Floating Polkadot Dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="polkadot-dot absolute top-1/4 left-1/4 animate-float" style={{ animationDelay: '0s' }} />
          <div className="polkadot-dot absolute top-1/3 right-1/4 animate-float" style={{ animationDelay: '1s' }} />
          <div className="polkadot-dot absolute bottom-1/3 left-1/3 animate-float" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            {/* Certificate Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full certificate-card mb-6">
              <FileCheck className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Certificate Verification Platform</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Secure Your Certificates on{" "}
            <span
              className="inline-block text-transparent bg-clip-text animate-gradient"
              style={{
                backgroundImage: 'linear-gradient(to right, #a855f7, #14b8a6, #a855f7)',
                backgroundSize: '300% 100%',
                animationDuration: '3s',
                WebkitBackgroundClip: 'text'
              }}
            >
              Polkadot
            </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transform academic and professional certificates into verifiable NFTs on Polkadot blockchain. 
              Immutable proof of your achievements, forever.
            </p>
            
            {/* Visual Trust Indicators */}
            <div className="flex items-center justify-center gap-8 mb-8 flex-wrap">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hexagon className="h-5 w-5 text-primary" />
                <span className="text-sm">Polkadot Powered</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">Blockchain Verified</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Network className="h-5 w-5 text-primary" />
                <span className="text-sm">Decentralized</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/mint">
                <Button variant="hero" size="xl" className="gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300">
                  Verify Certificate
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="glass" size="xl">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Loop Section */}
      <section className="py-5 relative bg-gradient-to-b from-background/50 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
          </div>
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
            <LogoLoop
              logos={[
                // { node: <SiPolkadot />, title: "Polkadot", href: "https://polkadot.network" },
                // { node: <SiEthereum />, title: "Ethereum", href: "https://ethereum.org" },
                { node: <SiAmazon />, title: "AWS", href: "https://aws.amazon.com" },
                { node: <SiCoursera />, title: "Coursera", href: "https://www.coursera.org" },
                { node: <SiUdemy />, title: "Udemy", href: "https://www.udemy.com" },
                { node: <SiCisco />, title: "Cisco", href: "https://www.cisco.com" },
              ]}
              speed={20}
              direction="left"
              logoHeight={48}
              gap={40}
              pauseOnHover
              scaleOnHover
              fadeOut
              fadeOutColor="hsl(var(--background))"
              ariaLabel="Technology partners"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 relative">
        {/* Smooth transition gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background pointer-events-none" />
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-primary rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-gradient-secondary rounded-full blur-2xl" />
          <div className="absolute bottom-1/3 left-1/3 w-28 h-28 bg-gradient-primary rounded-full blur-2xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to secure your certificates on Polkadot blockchain
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Upload,
                title: "Upload Certificate",
                description: "Upload your academic or professional certificate (PDF format)",
                step: "01"
              },
              {
                icon: Shield,
                title: "Verify on Polkadot",
                description: "Certificate hash is generated and anchored on Polkadot blockchain",
                step: "02"
              },
              {
                icon: Award,
                title: "Mint Certificate NFT",
                description: "Receive a verifiable NFT on Polkadot as permanent proof of your credentials",
                step: "03"
              }
            ].map((item, index) => (
              <div
                key={index}
                className="bg-background/90 backdrop-blur-sm border border-border/50 p-8 rounded-2xl hover:scale-105 transition-all duration-300 animate-fade-in relative group overflow-hidden shadow-lg hover:shadow-xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Polkadot dots decoration */}
                <div className="absolute -top-2 -right-2 w-20 h-20 bg-gradient-primary opacity-20 rounded-full blur-2xl" />
                
                <div className="absolute top-4 right-4 text-6xl font-bold text-primary/20 group-hover:text-primary/30 transition-colors">
                  {item.step}
                </div>
                <div className="bg-gradient-primary p-4 rounded-xl w-fit mb-6 shadow-glow">
                  <item.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground/80">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pb-20 relative">
        <div className="container mx-auto px-4">
          <div className="bg-background/95 backdrop-blur-sm border border-border/50 p-12 rounded-3xl max-w-5xl mx-auto animate-fade-in relative overflow-hidden shadow-xl">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-primary opacity-10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-secondary opacity-10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-8">
                <Hexagon className="h-8 w-8 text-primary" />
                <h2 className="text-4xl md:text-5xl font-bold text-center">
                  Why{" "}
                  <GradientText
                    colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                    animationSpeed={5}
                    showBorder={false}
                    className="inline"
                  >
                    Polkadot
                  </GradientText>{" "}
                  for Certificates?
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {[
                  {
                    title: "Immutable Certificate Storage",
                    description: "Your educational and professional certificates are permanently anchored on Polkadot, making them tamper-proof and verifiable forever."
                  },
                  {
                    title: "Interoperable Credentials",
                    description: "Polkadot's cross-chain architecture enables your certificates to be recognized across multiple blockchains and platforms."
                  },
                  {
                    title: "Instant Credential Verification",
                    description: "Employers and institutions can verify your certificates in seconds directly on Polkadot blockchain."
                  },
                  {
                    title: "Scalable & Sustainable",
                    description: "Built on Polkadot's energy-efficient infrastructure that scales with your growing credential portfolio."
                  }
                ].map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="polkadot-dot mt-2 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-foreground">{feature.title}</h3>
                      <p className="text-muted-foreground/80">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 CertifyChain. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
