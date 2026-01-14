import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, LogOut, Users } from 'lucide-react';
import { SetupModal } from './SetupModal';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [showSetup, setShowSetup] = useState(false);
  const { user, isAdmin, signOut } = useAuthContext();
  
  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/profissionais', label: 'Profissionais' },
    { path: '/programa-e-mais', label: 'Programa E+' },
    ...(isAdmin ? [{ path: '/usuarios', label: 'Usuários' }] : []),
  ];

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair');
    } else {
      toast.success('Logout realizado');
    }
  };

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

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              <span className="text-xs tracking-widest uppercase text-muted-foreground">
                {user?.email?.split('@')[0]}
                {isAdmin && <span className="ml-2 text-primary">(Admin)</span>}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-muted rounded transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Floating Setup Button - Only for Admins */}
      {isAdmin && (
        <button
          onClick={() => setShowSetup(true)}
          className="floating-button"
          title="Setup (Admin)"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      {/* Setup Modal - Only for Admins */}
      {isAdmin && <SetupModal open={showSetup} onOpenChange={setShowSetup} />}
    </div>
  );
}
