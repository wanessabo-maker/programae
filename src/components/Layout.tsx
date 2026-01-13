import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { SetupModal } from './SetupModal';
import logo from '@/assets/logo.png';
interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [showSetup, setShowSetup] = useState(false);
  
  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/profissionais', label: 'Profissionais' },
    { path: '/programa-e-mais', label: 'Programa E+' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <img 
                src={logo} 
                alt="Evviva Logo" 
                className="h-10 w-auto"
              />
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${
                    location.pathname === item.path ? 'nav-link-active' : 'opacity-60'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Floating Setup Button */}
      <button
        onClick={() => setShowSetup(true)}
        className="floating-button"
        title="Setup"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Setup Modal */}
      <SetupModal open={showSetup} onOpenChange={setShowSetup} />
    </div>
  );
}
