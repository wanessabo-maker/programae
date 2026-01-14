import { useState, useMemo } from 'react';
import { Gift, Award, Printer, Trash2, Calendar, Clock, XCircle, CheckCircle, AlertCircle, Pencil } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, parseISO, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProgramaEMais() {
  const { isAdmin } = useAuth();
  const {
    teamMembers,
    creditTransactions,
    rewards,
    actionTypes,
    getConsultantBalance,
    addCreditTransaction,
    updateCreditTransaction,
    deleteCreditTransaction,
    creditValiditySettings,
  } = useApp();

  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState<string | null>(null);
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [transactionToExtend, setTransactionToExtend] = useState<string | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [receiptData, setReceiptData] = useState<{
    consultantName: string;
    rewardName: string;
    cost: number;
    date: string;
  } | null>(null);

  const activeMembers = teamMembers.filter(m => m.active);

  // Balance by consultant
  const consultantBalances = useMemo(() => {
    return activeMembers.map(member => ({
      ...member,
      balance: getConsultantBalance(member.id),
    })).sort((a, b) => b.balance - a.balance);
  }, [activeMembers, getConsultantBalance]);

  // Monthly transactions with status calculation
  const monthlyTransactions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return creditTransactions
      .filter(t => isThisMonth(parseISO(t.date)))
      .map(t => {
        // Calculate actual status based on expiration
        let displayStatus = t.status;
        if (t.type === 'ganho' && t.status === 'active' && t.expiresAt && t.expiresAt < today) {
          displayStatus = 'expired';
        }
        return { ...t, displayStatus };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [creditTransactions]);

  // All transactions for history
  const allTransactions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return creditTransactions
      .map(t => {
        let displayStatus = t.status;
        if (t.type === 'ganho' && t.status === 'active' && t.expiresAt && t.expiresAt < today) {
          displayStatus = 'expired';
        }
        return { ...t, displayStatus };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [creditTransactions]);

  // How to earn points
  const pointsInfo = useMemo(() => {
    return actionTypes
      .filter(t => t.programPoints > 0)
      .sort((a, b) => b.programPoints - a.programPoints);
  }, [actionTypes]);

  const handleRedeem = () => {
    if (!selectedConsultant || !selectedReward) return;

    const consultant = teamMembers.find(m => m.id === selectedConsultant);
    const reward = rewards.find(r => r.id === selectedReward);
    
    if (!consultant || !reward) return;

    const balance = getConsultantBalance(selectedConsultant);
    if (balance < reward.cost) {
      alert('Saldo insuficiente!');
      return;
    }

    // Add debit transaction
    addCreditTransaction({
      consultantId: selectedConsultant,
      amount: reward.cost,
      type: 'resgate',
      description: `Resgate: ${reward.name}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      rewardId: selectedReward,
      status: 'used',
    });

    // Show receipt
    setReceiptData({
      consultantName: consultant.name,
      rewardName: reward.name,
      cost: reward.cost,
      date: format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }),
    });
    setShowReceipt(true);
    setShowRedeemModal(false);
    setSelectedConsultant(null);
    setSelectedReward(null);
  };

  const selectedConsultantBalance = selectedConsultant ? getConsultantBalance(selectedConsultant) : 0;

  const handleDeleteTransaction = () => {
    if (transactionToDelete) {
      deleteCreditTransaction(transactionToDelete);
      setTransactionToDelete(null);
    }
  };

  const handleExtendExpiration = () => {
    if (transactionToExtend && newExpirationDate) {
      updateCreditTransaction(transactionToExtend, { expiresAt: newExpirationDate });
      setTransactionToExtend(null);
      setNewExpirationDate('');
    }
  };

  const handleCancelCredit = (id: string) => {
    updateCreditTransaction(id, { status: 'expired' });
  };

  const getStatusBadge = (status: string, expiresAt?: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (status === 'used') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
          <CheckCircle className="w-3 h-3" />
          Utilizado
        </span>
      );
    }
    
    if (status === 'expired' || (expiresAt && expiresAt < today)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-destructive/20 text-destructive rounded">
          <XCircle className="w-3 h-3" />
          Expirado
        </span>
      );
    }
    
    // Check if expiring soon (within 7 days)
    if (expiresAt) {
      const daysUntilExpiry = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-warning/20 text-warning rounded">
            <AlertCircle className="w-3 h-3" />
            Expira em {daysUntilExpiry}d
          </span>
        );
      }
    }
    
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-success/20 text-success rounded">
        <CheckCircle className="w-3 h-3" />
        Ativo
      </span>
    );
  };

  const validityTypeLabels: Record<string, string> = {
    mensal: 'Mensal',
    anual: 'Anual',
    dias: `${creditValiditySettings.days || 30} dias`,
    sem_validade: 'Sem validade',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl">Programa E+</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Validade atual: {validityTypeLabels[creditValiditySettings.type]}
          </p>
        </div>
        <button
          onClick={() => setShowRedeemModal(true)}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Gift className="w-4 h-4" />
          Usar Créditos
        </button>
      </div>

      {/* Balances */}
      <section>
        <h2 className="title-section mb-4">Saldo por Colaborador</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {consultantBalances.map((consultant) => (
            <div key={consultant.id} className="card-flat text-center">
              <div className="metric-value">{consultant.balance}</div>
              <div className="metric-label">{consultant.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How to earn */}
      <section>
        <h2 className="title-section mb-4">Como Ganhar Créditos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pointsInfo.map((action) => (
            <div key={action.id} className="card-flat">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-black flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-light">+{action.programPoints}</div>
                  <div className="text-xs text-muted-foreground uppercase">{action.name}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Rewards Menu */}
      <section>
        <h2 className="title-section mb-4">Cardápio de Benefícios</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rewards.map((reward) => (
            <div key={reward.id} className="card-flat">
              <div className="flex items-center justify-between">
                <span className="text-sm">{reward.name}</span>
                <span className="text-lg font-light">{reward.cost}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Monthly Extract */}
      <section>
        <h2 className="title-section mb-4">
          Extrato do Mês ({format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })})
        </h2>
        {monthlyTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação este mês.</p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="card-flat overflow-hidden hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black">
                    <th className="table-header text-left p-3">Data</th>
                    <th className="table-header text-left p-3">Colaborador</th>
                    <th className="table-header text-left p-3">Descrição</th>
                    <th className="table-header text-center p-3">Status</th>
                    <th className="table-header text-center p-3">Expira em</th>
                    <th className="table-header text-right p-3">Créditos</th>
                    {isAdmin && <th className="table-header text-center p-3 w-24">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {monthlyTransactions.map((transaction) => {
                    const consultant = teamMembers.find(m => m.id === transaction.consultantId);
                    return (
                      <tr key={transaction.id} className="border-b border-black/10 last:border-0">
                        <td className="p-3 text-sm">{format(parseISO(transaction.date), 'dd/MM')}</td>
                        <td className="p-3 text-sm">{consultant?.name || '-'}</td>
                        <td className="p-3 text-sm">{transaction.description}</td>
                        <td className="p-3 text-center">
                          {transaction.type === 'ganho' ? getStatusBadge(transaction.displayStatus, transaction.expiresAt) : '-'}
                        </td>
                        <td className="p-3 text-sm text-center">
                          {transaction.expiresAt ? format(parseISO(transaction.expiresAt), 'dd/MM/yy') : '-'}
                        </td>
                        <td className={`p-3 text-sm text-right font-medium ${
                          transaction.type === 'ganho' ? 'text-success' : 'text-destructive'
                        }`}>
                          {transaction.type === 'ganho' ? '+' : '-'}{transaction.amount}
                        </td>
                        {isAdmin && (
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {transaction.type === 'ganho' && transaction.displayStatus === 'active' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setTransactionToExtend(transaction.id);
                                      setNewExpirationDate(transaction.expiresAt || '');
                                    }}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                    title="Prorrogar validade"
                                  >
                                    <Calendar className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleCancelCredit(transaction.id)}
                                    className="text-warning hover:text-warning/80 transition-colors p-1"
                                    title="Cancelar crédito"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => setTransactionToDelete(transaction.id)}
                                className="text-destructive hover:text-destructive/80 transition-colors p-1"
                                title="Excluir transação"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
              {monthlyTransactions.map((transaction) => {
                const consultant = teamMembers.find(m => m.id === transaction.consultantId);
                return (
                  <div key={transaction.id} className="card-flat">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium">{consultant?.name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{transaction.description}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${
                          transaction.type === 'ganho' ? 'text-success' : 'text-destructive'
                        }`}>
                          {transaction.type === 'ganho' ? '+' : '-'}{transaction.amount}
                        </span>
                        <p className="text-xs text-muted-foreground">{format(parseISO(transaction.date), 'dd/MM')}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {transaction.type === 'ganho' && getStatusBadge(transaction.displayStatus, transaction.expiresAt)}
                        {transaction.expiresAt && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(transaction.expiresAt), 'dd/MM/yy')}
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setTransactionToDelete(transaction.id)}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Redeem Modal */}
      <Dialog open={showRedeemModal} onOpenChange={setShowRedeemModal}>
        <DialogContent className="bg-card text-card-foreground border-black max-w-md">
          <DialogHeader>
            <DialogTitle>USAR CRÉDITOS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Colaborador</label>
              <select
                value={selectedConsultant || ''}
                onChange={(e) => setSelectedConsultant(e.target.value)}
                className="input-flat w-full text-card-foreground"
              >
                <option value="">Selecione</option>
                {consultantBalances.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.balance} créditos)
                  </option>
                ))}
              </select>
            </div>

            {selectedConsultant && (
              <>
                <div className="text-center py-4 border border-black">
                  <div className="metric-value">{selectedConsultantBalance}</div>
                  <div className="metric-label">Créditos disponíveis</div>
                </div>

                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Benefício</label>
                  <div className="space-y-2">
                    {rewards.map((reward) => (
                      <button
                        key={reward.id}
                        onClick={() => setSelectedReward(reward.id)}
                        disabled={selectedConsultantBalance < reward.cost}
                        className={`w-full p-3 border text-left flex items-center justify-between ${
                          selectedReward === reward.id 
                            ? 'border-black bg-black text-white' 
                            : 'border-black/30 hover:border-black'
                        } ${selectedConsultantBalance < reward.cost ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-sm">{reward.name}</span>
                        <span className="text-sm">{reward.cost} créditos</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              onClick={handleRedeem}
              disabled={!selectedConsultant || !selectedReward}
              className="btn-primary w-full bg-card-foreground text-card disabled:opacity-40"
            >
              Resgatar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="bg-card text-card-foreground border-black max-w-md">
          <DialogHeader>
            <DialogTitle>COMPROVANTE DE RESGATE</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-6 py-4">
              <div className="text-center border border-black p-6">
                <Gift className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg mb-2">{receiptData.rewardName}</h3>
                <p className="text-3xl font-light mb-4">{receiptData.cost} créditos</p>
                <div className="text-sm text-muted-foreground">
                  <p>{receiptData.consultantName}</p>
                  <p>{receiptData.date}</p>
                </div>
              </div>
              
              <div className="bg-warning/10 border border-warning p-4 text-center">
                <Printer className="w-5 h-5 mx-auto mb-2 text-warning" />
                <p className="text-sm text-warning">
                  Printe esta tela e apresente à gerência
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="btn-secondary w-full border-card-foreground text-card-foreground flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Expiration Dialog */}
      <Dialog open={!!transactionToExtend} onOpenChange={(open) => !open && setTransactionToExtend(null)}>
        <DialogContent className="bg-card text-card-foreground border-black max-w-sm">
          <DialogHeader>
            <DialogTitle>PRORROGAR VALIDADE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                Nova data de expiração
              </label>
              <input
                type="date"
                value={newExpirationDate}
                onChange={(e) => setNewExpirationDate(e.target.value)}
                className="input-flat w-full text-card-foreground"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExtendExpiration}
                disabled={!newExpirationDate}
                className="btn-primary flex-1 bg-card-foreground text-card disabled:opacity-40"
              >
                Confirmar
              </button>
              <button
                onClick={() => setTransactionToExtend(null)}
                className="btn-secondary flex-1 border-card-foreground text-card-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}