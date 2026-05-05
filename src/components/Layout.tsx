import { ReactNode, useState, useMemo } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Settings, LogOut, Menu, X } from 'lucide-react';
import { SetupModal } from './SetupModal';
import { useAuthContext, FunctionalArea } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import logo from '@/assets/logo-evviva-white.png';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface LayoutProps {
  children: ReactNode;
}

// Mapping between route paths and functional areas
const ROUTE_AREA_MAP: Record<string, FunctionalArea | null> = {
  '/': null, // Dashboard - always accessible
  '/comercial': 'comercial',
  '/projetos': 'projetos',
  '/customer-success': 'customer_success',
  '/programa-e-mais': null, // Programa E+ - always accessible
  '/minha-area': null, // Minha Área - always accessible to logged in users
  '/usuarios': null, // Admin only, handled separately
  '/gestora': null, // Admin only, handled separately
};

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [showSetup, setShowSetup] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin, userAreas, hasAreaAccess, signOut } = useAuthContext();

  // Check if user can access current route
  const canAccessCurrentRoute = useMemo(() => {
    const path = location.pathname;
    
    // Admin routes
    if (path === '/usuarios') return isAdmin;
    if (path === '/gestora') return isAdmin;

    // Cliente timeline accessible to any authenticated user (deep link from modules)
    if (path.startsWith('/cliente/')) return true;
    
    // CS & AT is accessible to users with customer_success, assistencia_tecnica, or comercial areas
    if (path === '/customer-success') {
      return hasAreaAccess('customer_success') 
        || hasAreaAccess('assistencia_tecnica') 
        || hasAreaAccess('comercial');
    }
    
    const requiredArea = ROUTE_AREA_MAP[path];
    
    // Public routes (dashboard, programa E+)
    if (requiredArea === null) return true;
    
    // Check area access
    return hasAreaAccess(requiredArea);
  }, [location.pathname, isAdmin, hasAreaAccess]);

  // Filter nav items based on user's area access
  const navItems = useMemo(() => {
    const allItems = [
      { path: '/', label: 'Dashboard', area: null },
      { path: '/minha-area', label: 'Minha Área', area: null },
      { path: '/comercial', label: 'Comercial', area: 'comercial' as FunctionalArea },
      { path: '/projetos', label: 'Projetos', area: 'projetos' as FunctionalArea },
      { path: '/customer-success', label: 'CS & AT', area: 'customer_success' as FunctionalArea },
      { path: '/programa-e-mais', label: 'Programa E+', area: null },
      { path: '/planner-apresentacao', label: 'Planner Apres.', area: 'comercial' as FunctionalArea },
    ];

    const filteredItems = allItems.filter(item => {
      // Public routes are always visible
      if (item.area === null) return true;
      // CS & AT is accessible to users with customer_success, assistencia_tecnica, or comercial areas
      if (item.path === '/customer-success') {
        return hasAreaAccess('customer_success') 
          || hasAreaAccess('assistencia_tecnica') 
          || hasAreaAccess('comercial');
      }
      // Check area access
      return hasAreaAccess(item.area);
    });

    // Add admin-only routes
    if (isAdmin) {
      filteredItems.push({ path: '/usuarios', label: 'Usuários', area: null });
    }

    return filteredItems;
  }, [isAdmin, hasAreaAccess]);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair');
    } else {
      toast.success('Logout realizado');
    }
  };

  // Redirect if user doesn't have access to current route
  if (!canAccessCurrentRoute) {
    return <Navigate to="/" replace />;
  }

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
                className="h-12 sm:h-15 w-auto object-scale-down"
              />
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-6">
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
