import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Trash2, Calendar, Clock, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreditTransaction, ActionType, Action } from '@/types';

interface ConsultantBalanceCardProps {
  consultant: {
    id: string;
    name: string;
    balance: number;
  };
  transactions: CreditTransaction[];
  actionTypes: ActionType[];
  actions: Action[];
  isAdmin: boolean;
  onDeleteTransaction: (id: string) => void;
}

export default function ConsultantBalanceCard({
  consultant,
  transactions,
  actionTypes,
  actions,
  isAdmin,
  onDeleteTransaction,
}: ConsultantBalanceCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // Filter transactions for this consultant and calculate display status
  const consultantTransactions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transactions
      .filter(t => t.consultantId === consultant.id)
      .map(t => {
        let displayStatus = t.status;
        if (t.type === 'ganho' && t.status === 'active' && t.expiresAt && t.expiresAt < today) {
          displayStatus = 'expired';
        }
        return { ...t, displayStatus };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, consultant.id]);

  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      onDeleteTransaction(transactionToDelete);
      setTransactionToDelete(null);
    }
  };

  const getStatusBadge = (status: string, expiresAt?: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (status === 'used') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
          <CheckCircle className="w-2.5 h-2.5" />
          Utilizado
        </span>
      );
    }
    
    if (status === 'expired' || (expiresAt && expiresAt < today)) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-destructive/20 text-destructive rounded">
          <XCircle className="w-2.5 h-2.5" />
          Expirado
        </span>
      );
    }
    
    // Check if expiring soon (within 7 days)
    if (expiresAt) {
      const daysUntilExpiry = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-warning/20 text-warning rounded">
            <AlertCircle className="w-2.5 h-2.5" />
            Expira em {daysUntilExpiry}d
          </span>
        );
      }
    }
    
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-success/20 text-success rounded">
        <CheckCircle className="w-2.5 h-2.5" />
        Ativo
      </span>
    );
  };

  const getActionTypeName = (transaction: CreditTransaction) => {
    if (transaction.actionId) {
      // Find the action to get the action type
      const action = actions.find(a => a.id === transaction.actionId);
      if (action) {
        const actionType = actionTypes.find(at => at.id === action.actionTypeId);
        return actionType?.name || '-';
      }
    }
    // Try to extract from description for redemptions
    if (transaction.type === 'resgate') {
      return 'Resgate';
    }
    return '-';
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="card-flat">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="metric-value">{consultant.balance}</div>
                <div className="metric-label">{consultant.name}</div>
              </div>
              <div className="text-muted-foreground">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t border-black/10">
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                Extrato de Créditos
              </h4>
              
              {consultantTransactions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhuma transação encontrada.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {consultantTransactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-start justify-between p-2 bg-muted/30 rounded text-xs gap-2"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {format(parseISO(transaction.date), 'dd/MM/yy')}
                          </span>
                          <span className="text-muted-foreground">
                            {getActionTypeName(transaction)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {transaction.type === 'ganho' && getStatusBadge(transaction.displayStatus, transaction.expiresAt)}
                          {transaction.expiresAt && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              Exp: {format(parseISO(transaction.expiresAt), 'dd/MM/yy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium whitespace-nowrap ${
                          transaction.type === 'ganho' ? 'text-success' : 'text-destructive'
                        }`}>
                          {transaction.type === 'ganho' ? '+' : '-'}{transaction.amount}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransactionToDelete(transaction.id);
                            }}
                            className="text-destructive hover:text-destructive/80 transition-colors p-1"
                            title="Excluir transação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este crédito? O saldo do colaborador será atualizado imediatamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
