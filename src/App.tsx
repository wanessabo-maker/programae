import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Profissionais from "./pages/Profissionais";
import ProgramaEMais from "./pages/ProgramaEMais";
import Usuarios from "./pages/Usuarios";
import Comercial from "./pages/Comercial";
import CustomerSuccess from "./pages/CustomerSuccess";
import Projetos from "./pages/Projetos";
import MinhaArea from "./pages/MinhaArea";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-widest uppercase text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-widest uppercase text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-widest uppercase text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Index />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profissionais"
        element={
          <ProtectedRoute>
            <Layout>
              <Profissionais />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/comercial"
        element={
          <ProtectedRoute>
            <Layout>
              <Comercial />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos"
        element={
          <ProtectedRoute>
            <Layout>
              <Projetos />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer-success"
        element={
          <ProtectedRoute>
            <Layout>
              <CustomerSuccess />
            </Layout>
          </ProtectedRoute>
        }
      />
        <Route
          path="/programa-e-mais"
          element={
            <ProtectedRoute>
              <Layout>
                <ProgramaEMais />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/minha-area"
          element={
            <ProtectedRoute>
              <MinhaArea />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
          <AdminRoute>
            <Layout>
              <Usuarios />
            </Layout>
          </AdminRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Separate component that uses auth context - must be inside AuthProvider
function AuthenticatedApp() {
  return (
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
