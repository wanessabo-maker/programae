import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, LogOut, Menu, X } from 'lucide-react';
import { SetupModal } from './SetupModal';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [showSetup, setShowSetup] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuthContext();
  
  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/comercial', label: 'Comercial' },
    { path: '/projetos', label: 'Projetos' },
    { path: '/customer-success', label: 'CS & AT' },
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <img 
                src={logo} 
                alt="Evviva Logo" 
                className="h-8 sm:h-10 w-auto"
              />
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
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

            {/* Desktop User Info & Logout */}
            <div className="hidden md:flex items-center gap-4">
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

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <button className="p-2 hover:bg-muted rounded transition-colors">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] bg-background border-l border-border">
                <div className="flex flex-col h-full pt-8">
                  {/* Mobile User Info */}
                  <div className="px-2 pb-4 border-b border-border mb-4">
                    <span className="text-sm tracking-widest uppercase text-foreground font-medium">
                      {user?.email?.split('@')[0]}
                      {isAdmin && <span className="ml-2 text-primary font-semibold">(Admin)</span>}
                    </span>
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex flex-col gap-1 flex-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-4 py-3 text-sm tracking-widest uppercase transition-colors ${
                          location.pathname === item.path 
                            ? 'bg-primary text-primary-foreground font-semibold' 
                            : 'text-foreground/80 hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>

                  {/* Mobile Logout */}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-3 text-sm tracking-widest uppercase text-foreground/80 hover:text-foreground hover:bg-muted border-t border-border mt-4"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
