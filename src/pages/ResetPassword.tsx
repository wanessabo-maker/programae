import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo-dark.svg';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the RECOVERY event from the URL token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });

    // Also check if user is already authenticated (came from recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Senha alterada com sucesso!');
        navigate('/');
      }
    } catch {
      toast.error('Erro ao alterar senha');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border p-8">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="Evviva Logo" className="h-12 w-auto" />
          </div>

          <h1 className="text-xs tracking-widest uppercase text-center mb-8">
            Nova Senha
          </h1>

          {!isReady ? (
            <p className="text-sm text-muted-foreground text-center">
              Verificando link de recuperação...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-flat w-full text-card-foreground"
                  placeholder="••••••"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-flat w-full text-card-foreground"
                  placeholder="••••••"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full bg-card-foreground text-card mt-6 disabled:opacity-50"
              >
                {isSubmitting ? 'Aguarde...' : 'Alterar Senha'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/auth')}
              className="text-xs tracking-widest uppercase text-muted-foreground hover:text-card-foreground transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
