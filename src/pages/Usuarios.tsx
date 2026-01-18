import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, ShieldOff, Users, Loader2, RefreshCw, Trash2, ChevronLeft, ChevronRight, Link, Unlink, AlertCircle, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { UserAreasModal } from '@/components/UserAreasModal';
import { Database } from '@/integrations/supabase/types';

type FunctionalArea = Database['public']['Enums']['functional_area'];

interface TeamMemberInfo {
  id: string;
  name: string;
  areaId: string | null;
  areaName: string | null;
  active: boolean;
  userId?: string | null;
}

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
  areas: FunctionalArea[];
  teamMember: TeamMemberInfo | null;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Area labels for display
const AREA_LABELS: Record<FunctionalArea, string> = {
  comercial: 'Comercial',
  projetos: 'Projetos',
  customer_success: 'CS & AT',
  assistencia_tecnica: 'Assist. Téc.',
};

export default function Usuarios() {
  const { user: currentUser, isAdmin } = useAuthContext();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Link modal state
  const [linkingUser, setLinkingUser] = useState<UserWithRole | null>(null);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string>('');
  
  // Areas modal state
  const [areasUser, setAreasUser] = useState<UserWithRole | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Refresh session to ensure a valid token before calling edge function
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await supabase.functions.invoke('list-users', {
        headers: {
          Authorization: `Bearer ${refreshData.session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setUsers(response.data.users || []);
      setTeamMembers(response.data.teamMembers || []);
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

  // Pagination logic
  const totalPages = Math.ceil(users.length / pageSize);
  
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return users.slice(startIndex, startIndex + pageSize);
  }, [users, currentPage, pageSize]);

  // Reset to page 1 when pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  // Ensure currentPage is valid when users change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Get available team members for linking (not linked to another user or linked to current user)
  const availableTeamMembers = useMemo(() => {
    if (!linkingUser) return [];
    return teamMembers.filter(tm => 
      !tm.userId || tm.userId === linkingUser.id
    );
  }, [teamMembers, linkingUser]);

  // Count users without link
  const usersWithoutLink = useMemo(() => {
    return users.filter(u => !u.teamMember).length;
  }, [users]);

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

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setProcessingUserId(deletingUser.id);

    try {
      // Refresh session to ensure a valid token before calling edge function
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await supabase.functions.invoke('delete-user', {
        headers: {
          Authorization: `Bearer ${refreshData.session.access_token}`,
        },
        body: { userId: deletingUser.id },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('Usuário excluído com sucesso');
      setDeletingUser(null);
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleOpenLinkModal = (user: UserWithRole) => {
    setLinkingUser(user);
    setSelectedTeamMemberId(user.teamMember?.id || '__none__');
  };

  const handleLinkTeamMember = async () => {
    if (!linkingUser) return;

    setProcessingUserId(linkingUser.id);

    try {
      const newTeamMemberId = selectedTeamMemberId === '__none__' ? null : selectedTeamMemberId;

      // If user currently has a team member linked, remove the link first
      if (linkingUser.teamMember) {
        const { error: unlinkError } = await supabase
          .from('team_members')
          .update({ user_id: null })
          .eq('id', linkingUser.teamMember.id);

        if (unlinkError) throw unlinkError;
      }

      // If a new team member is selected, link it
      if (newTeamMemberId) {
        const { error: linkError } = await supabase
          .from('team_members')
          .update({ user_id: linkingUser.id })
          .eq('id', newTeamMemberId);

        if (linkError) throw linkError;
        toast.success('Usuário vinculado ao membro da equipe');
      } else {
        toast.success('Vínculo removido com sucesso');
      }

      setLinkingUser(null);
      setSelectedTeamMemberId('__none__');
      await fetchUsers();
    } catch (error) {
      console.error('Error linking team member:', error);
      toast.error('Erro ao vincular membro da equipe');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleUnlinkTeamMember = async (user: UserWithRole) => {
    if (!user.teamMember) return;

    setProcessingUserId(user.id);

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ user_id: null })
        .eq('id', user.teamMember.id);

      if (error) throw error;
      toast.success('Vínculo removido com sucesso');
      await fetchUsers();
    } catch (error) {
      console.error('Error unlinking team member:', error);
      toast.error('Erro ao remover vínculo');
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

      {/* Alert for users without link */}
      {usersWithoutLink > 0 && (
        <div className="flex items-center gap-3 p-4 border border-destructive/50 bg-destructive/10">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">
              {usersWithoutLink} usuário{usersWithoutLink > 1 ? 's' : ''} sem vínculo com a equipe
            </p>
            <p className="text-xs text-muted-foreground">
              Usuários sem vínculo não terão indicadores individuais nem filtros automáticos.
            </p>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-card border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs tracking-widest uppercase font-semibold text-black px-4 py-3">
                Email
              </th>
              <th className="text-left text-xs tracking-widest uppercase font-semibold text-black px-4 py-3">
                Membro da Equipe
              </th>
              <th className="text-left text-xs tracking-widest uppercase font-semibold text-black px-4 py-3">
                Áreas
              </th>
              <th className="text-left text-xs tracking-widest uppercase font-semibold text-black px-4 py-3">
                Cadastro
              </th>
              <th className="text-left text-xs tracking-widest uppercase font-semibold text-black px-4 py-3">
                Papéis
              </th>
              <th className="text-right text-xs tracking-widest uppercase font-semibold text-black px-4 py-3">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => {
              const isUserAdmin = user.roles.includes('admin');
              const isCurrentUser = user.id === currentUser?.id;
              const isProcessing = processingUserId === user.id;

              return (
                <tr key={user.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-black">
                        {user.email}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs font-normal text-black/70">(você)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.teamMember ? (
                      <div className="flex items-center gap-2">
                        <Link className="w-3 h-3 text-primary" />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-black">{user.teamMember.name}</span>
                          {user.teamMember.areaName && (
                            <span className="text-xs font-medium text-black/70">{user.teamMember.areaName}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-destructive">
                        <Unlink className="w-3 h-3" />
                        <span className="text-xs font-semibold">Sem vínculo</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isUserAdmin ? (
                      <span className="text-xs text-primary font-semibold">Todas (Admin)</span>
                    ) : user.areas && user.areas.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.areas.map((area) => (
                          <span
                            key={area}
                            className="text-xs px-1.5 py-0.5 border border-black/30 bg-muted font-medium text-black"
                          >
                            {AREA_LABELS[area]}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-black/60">Nenhuma</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-black">
                    {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`text-xs tracking-widest uppercase px-2 py-1 border font-semibold ${
                            role === 'admin'
                              ? 'border-primary text-primary bg-primary/10'
                              : 'border-black/30 text-black'
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Areas Button */}
                      <button
                        onClick={() => setAreasUser(user)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs tracking-widest uppercase border border-border hover:bg-muted transition-colors disabled:opacity-50 text-black"
                        title="Gerenciar áreas"
                      >
                        <MapPin className="w-3 h-3" />
                        Áreas
                      </button>

                      {/* Link/Edit Link Button */}
                      <button
                        onClick={() => handleOpenLinkModal(user)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs tracking-widest uppercase border border-border hover:bg-muted transition-colors disabled:opacity-50 text-black"
                        title={user.teamMember ? "Alterar vínculo" : "Vincular à equipe"}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Link className="w-3 h-3" />
                        )}
                        {user.teamMember ? 'Alterar' : 'Vincular'}
                      </button>

                      {/* Unlink Button (only if linked) */}
                      {user.teamMember && (
                        <button
                          onClick={() => handleUnlinkTeamMember(user)}
                          disabled={isProcessing}
                          className="inline-flex items-center justify-center w-8 h-8 border border-border hover:bg-muted transition-colors disabled:opacity-50 text-black"
                          title="Remover vínculo"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Unlink className="w-3 h-3" />
                          )}
                        </button>
                      )}

                      {!isCurrentUser && (
                        <>
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
                          <button
                            onClick={() => setDeletingUser(user)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs tracking-widest uppercase border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
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

      {/* Pagination */}
      {users.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Exibir</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">por página</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-xs">
              {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, users.length)} de {users.length}
            </span>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center w-8 h-8 border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`inline-flex items-center justify-center w-8 h-8 text-xs transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border hover:bg-muted'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center justify-center w-8 h-8 border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• O primeiro usuário a se cadastrar automaticamente recebe papel de admin</p>
        <p>• Admins podem acessar o SETUP, gerenciar usuários e todas as áreas do sistema</p>
        <p>• Você não pode remover seu próprio papel de admin ou excluir sua conta</p>
        <p>• <strong>Vínculo com equipe:</strong> Cada usuário deve estar vinculado a um membro da equipe para ter indicadores individuais</p>
        <p>• <strong>Áreas:</strong> Dashboard e Programa E+ são acessíveis a todos. Demais áreas devem ser habilitadas por usuário</p>
        <p>• Alterações nas áreas têm efeito imediato (usuário pode precisar recarregar a página)</p>
      </div>

      {/* User Areas Modal */}
      <UserAreasModal
        user={areasUser}
        onClose={() => setAreasUser(null)}
        onSuccess={fetchUsers}
      />

      {/* Link Team Member Dialog */}
      <Dialog open={!!linkingUser} onOpenChange={() => setLinkingUser(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base tracking-widest uppercase">
              Vincular à Equipe
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Usuário: <strong className="text-foreground">{linkingUser?.email}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs tracking-widest uppercase text-muted-foreground">
                Membro da Equipe
              </label>
              <Select
                value={selectedTeamMemberId}
                onValueChange={setSelectedTeamMemberId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um membro da equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">Nenhum (remover vínculo)</span>
                  </SelectItem>
                  {availableTeamMembers.map((tm) => (
                    <SelectItem key={tm.id} value={tm.id}>
                      <div className="flex items-center gap-2">
                        <span>{tm.name}</span>
                        {tm.areaName && (
                          <span className="text-xs text-muted-foreground">({tm.areaName})</span>
                        )}
                        {tm.userId === linkingUser?.id && (
                          <span className="text-xs text-primary">(atual)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {availableTeamMembers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Todos os membros da equipe já estão vinculados a outros usuários.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setLinkingUser(null)}
              className="px-4 py-2 text-xs tracking-widest uppercase border border-border hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleLinkTeamMember}
              disabled={processingUserId === linkingUser?.id}
              className="px-4 py-2 text-xs tracking-widest uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {processingUserId === linkingUser?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Salvar'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deletingUser?.email}</strong>?
              <br />
              Esta ação não pode ser desfeita.
              {deletingUser?.teamMember && (
                <>
                  <br /><br />
                  <span className="text-destructive">
                    Atenção: Este usuário está vinculado a {deletingUser.teamMember.name}. O vínculo será removido.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs tracking-widest uppercase">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs tracking-widest uppercase"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
