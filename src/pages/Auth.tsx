import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/logo-dark.svg';

type AuthMode = 'login' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          toast.error('Preencha todos os campos');
          return;
        }
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou senha incorretos');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Login realizado com sucesso!');
        }
      } else if (mode === 'forgot') {
        if (!email) {
          toast.error('Digite seu email');
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
          setMode('login');
        }
      }
    } catch (err) {
      toast.error('Erro ao processar solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Entrar';
      case 'forgot': return 'Recuperar Senha';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={logo} alt="Evviva Logo" className="h-12 w-auto" />
          </div>

          {/* Title */}
          <h1 className="text-xs tracking-widest uppercase text-center mb-8">
            {getTitle()}
          </h1>

          {/* Login / Signup / Forgot Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-flat w-full text-card-foreground"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-flat w-full text-card-foreground"
                    placeholder="••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full bg-card-foreground text-card mt-6 disabled:opacity-50"
              >
                {isSubmitting ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Enviar Email'}
              </button>
            </form>

          {/* Forgot Password Link (only on login) */}
          {mode === 'login' && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setMode('forgot')}
                className="text-xs tracking-widest uppercase text-muted-foreground hover:text-card-foreground transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {/* Mode Toggles */}
          <div className="mt-6 text-center space-y-2">
            {mode === 'forgot' && (
              <button
                onClick={() => setMode('login')}
                className="text-xs tracking-widest uppercase text-muted-foreground hover:text-card-foreground transition-colors"
              >
                Voltar ao login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
