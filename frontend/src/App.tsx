import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { Web3Provider } from './contexts/Web3Context';
import { Navigation } from './components/Navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DebugHelper } from './components/DebugHelper';
import LandingPage from './pages/LandingPage';
import { MintCertificatePage } from './pages/MintCertificatePage';
import { AllCertificatesPage } from './pages/AllCertificatesPage';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Web3Provider>
          <Router>
            <div className="min-h-screen bg-background text-foreground">
              <Navigation />
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/mint" element={<MintCertificatePage />} />
                    <Route path="/certificates" element={<AllCertificatesPage />} />
                  </Routes>
                  <DebugHelper />
            </div>
          </Router>
        </Web3Provider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
