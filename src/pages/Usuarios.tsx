import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, ShieldOff, Users, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
}

export default function Usuarios() {
  const { user: currentUser, isAdmin } = useAuthContext();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await supabase.functions.invoke('list-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleToggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (userId === currentUser?.id) {
      toast.error('Você não pode alterar seu próprio papel');
      return;
    }

    setProcessingUserId(userId);

    try {
      if (currentlyAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
        toast.success('Papel de admin removido');
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
        toast.success('Usuário promovido a admin');
      }

      await fetchUsers();
    } catch (error) {
      console.error('Error toggling admin:', error);
      toast.error('Erro ao alterar papel do usuário');
    } finally {
      setProcessingUserId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6" />
          <h1 className="text-lg tracking-widest uppercase">Gerenciar Usuários</h1>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-3 py-1.5 text-xs tracking-widest uppercase border border-border hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Atualizar
        </button>
      </div>

      {/* Users List */}
      <div className="bg-card border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs tracking-widest uppercase text-muted-foreground px-4 py-3">
                Email
              </th>
              <th className="text-left text-xs tracking-widest uppercase text-muted-foreground px-4 py-3">
                Cadastro
              </th>
              <th className="text-left text-xs tracking-widest uppercase text-muted-foreground px-4 py-3">
                Papéis
              </th>
              <th className="text-right text-xs tracking-widest uppercase text-muted-foreground px-4 py-3">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isUserAdmin = user.roles.includes('admin');
              const isCurrentUser = user.id === currentUser?.id;
              const isProcessing = processingUserId === user.id;

              return (
                <tr key={user.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {user.email}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`text-xs tracking-widest uppercase px-2 py-1 border ${
                            role === 'admin'
                              ? 'border-primary text-primary'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isCurrentUser && (
                      <button
                        onClick={() => handleToggleAdmin(user.id, isUserAdmin)}
                        disabled={isProcessing}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs tracking-widest uppercase border transition-colors disabled:opacity-50 ${
                          isUserAdmin
                            ? 'border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground'
                            : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                        }`}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isUserAdmin ? (
                          <>
                            <ShieldOff className="w-3 h-3" />
                            Remover Admin
                          </>
                        ) : (
                          <>
                            <Shield className="w-3 h-3" />
                            Promover Admin
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum usuário encontrado
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• O primeiro usuário a se cadastrar automaticamente recebe papel de admin</p>
        <p>• Admins podem acessar o SETUP e gerenciar usuários</p>
        <p>• Você não pode remover seu próprio papel de admin</p>
      </div>
    </div>
  );
}
