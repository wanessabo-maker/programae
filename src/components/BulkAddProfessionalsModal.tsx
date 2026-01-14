import { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSpreadsheet, AlertCircle, Check, X, ClipboardList, FileUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '@/contexts/AppContext';
import { format, parseISO, isValid } from 'date-fns';
import { calculateProfessionalCategory, getCategoryForAction } from '@/hooks/useProfessionalCategory';

interface BulkAddProfessionalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  name: string;
  typeName: string;
  consultantName: string;
  lastActionDate?: string;
  lastActionName?: string;
  isValid: boolean;
  errors: string[];
  typeId?: string;
  consultantId?: string;
  categoryId?: string;
  lastActionTypeId?: string;
}

export function BulkAddProfessionalsModal({ open, onOpenChange }: BulkAddProfessionalsModalProps) {
  const { 
    professionalTypes, 
    teamMembers, 
    professionalCategories,
    actionTypes,
    addProfessional 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'manual' | 'file'>('manual');
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [manualText, setManualText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMembers = teamMembers.filter(m => m.active);
  const sortedCategories = useMemo(() => 
    [...professionalCategories].sort((a, b) => a.order - b.order), 
    [professionalCategories]
  );

  // Get default category (highest order = "Novo" or last category)
  const defaultCategoryId = sortedCategories[sortedCategories.length - 1]?.id || '';

  const parseDate = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined;
    
    // Try common date formats
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    ];

    for (const pattern of formats) {
      const match = dateStr.match(pattern);
      if (match) {
        if (pattern === formats[2]) {
          // YYYY-MM-DD
          return dateStr;
        }
        // DD/MM/YYYY or DD-MM-YYYY
        const [, day, month, year] = match;
        const isoDate = `${year}-${month}-${day}`;
        if (isValid(parseISO(isoDate))) {
          return isoDate;
        }
      }
    }
    return undefined;
  };

  const processRow = (
    name: string, 
    typeName: string, 
    consultantName: string, 
    lastActionDateStr?: string,
    lastActionNameStr?: string
  ): ImportRow => {
    const errors: string[] = [];
    
    const trimmedName = name.trim();
    const trimmedType = typeName.trim();
    const trimmedConsultant = consultantName.trim();
    const trimmedLastAction = lastActionNameStr?.trim() || '';
    
    if (!trimmedName) errors.push('Nome obrigatório');
    if (!trimmedType) errors.push('Tipo obrigatório');
    
    const matchedType = professionalTypes.find(
      t => t.name.toLowerCase() === trimmedType.toLowerCase()
    );
    if (trimmedType && !matchedType) {
      errors.push(`Tipo "${trimmedType}" não encontrado`);
    }

    const matchedConsultant = activeMembers.find(
      m => m.name.toLowerCase() === trimmedConsultant.toLowerCase()
    );
    // Consultant is optional
    
    let parsedDate: string | undefined;
    if (lastActionDateStr) {
      parsedDate = parseDate(lastActionDateStr.trim());
      if (!parsedDate) {
        errors.push('Formato de data inválido');
      }
    }

    // Match last action type if provided
    let matchedActionType;
    if (trimmedLastAction) {
      matchedActionType = actionTypes.find(
        at => at.name.toLowerCase() === trimmedLastAction.toLowerCase()
      );
      if (!matchedActionType) {
        errors.push(`Ação "${trimmedLastAction}" não encontrada`);
      }
    }

    // Determine category based on last action
    let categoryId = defaultCategoryId;
    if (parsedDate && matchedActionType) {
      // Use the category matching system
      const matchedCategory = getCategoryForAction(matchedActionType, professionalCategories);
      if (matchedCategory) {
        categoryId = matchedCategory.id;
      }
    }

    return {
      name: trimmedName,
      typeName: trimmedType,
      consultantName: trimmedConsultant,
      lastActionDate: parsedDate,
      lastActionName: trimmedLastAction,
      isValid: errors.length === 0,
      errors,
      typeId: matchedType?.id,
      consultantId: matchedConsultant?.id,
      categoryId,
      lastActionTypeId: matchedActionType?.id,
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false });

        const processedData: ImportRow[] = jsonData.map((row) => {
          const name = (row['Nome'] || row['nome'] || row['NOME'] || '').toString();
          const typeName = (row['Tipo'] || row['tipo'] || row['TIPO'] || '').toString();
          const consultantName = (row['Consultor'] || row['consultor'] || row['CONSULTOR'] || '').toString();
          const lastActionDate = (row['Data da Última Ação'] || row['data da última ação'] || row['Data Última Ação'] || row['Última Ação Data'] || '').toString();
          const lastActionName = (row['Última Ação'] || row['última ação'] || row['ÚLTIMA AÇÃO'] || row['Tipo Ação'] || '').toString();

          return processRow(name, typeName, consultantName, lastActionDate, lastActionName);
        });

        setImportData(processedData);
        setImportComplete(false);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Erro ao ler o arquivo. Verifique se é um arquivo Excel ou CSV válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleManualParse = () => {
    if (!manualText.trim()) return;

    const lines = manualText.trim().split('\n');
    const processedData: ImportRow[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // Try to detect separator (tab, comma, semicolon)
      let parts: string[];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else {
        // Single column - just the name, other fields will be missing
        parts = [line];
      }

      const [name = '', typeName = '', consultantName = '', lastActionDate = '', lastActionName = ''] = parts;
      processedData.push(processRow(name, typeName, consultantName, lastActionDate, lastActionName));
    }

    setImportData(processedData);
    setImportComplete(false);
  };

  const handleImport = async () => {
    const validRows = importData.filter(row => row.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    let count = 0;

    for (const row of validRows) {
      if (row.typeId) {
        await addProfessional({
          name: row.name,
          typeId: row.typeId,
          consultantId: row.consultantId || '',
          categoryId: row.categoryId || defaultCategoryId,
          lastActionDate: row.lastActionDate,
          lastActionTypeId: row.lastActionTypeId,
        });
        count++;
      }
    }

    setImportedCount(count);
    setImportComplete(true);
    setIsProcessing(false);
  };

  const handleClose = () => {
    setImportData([]);
    setManualText('');
    setImportComplete(false);
    setImportedCount(0);
    setActiveTab('manual');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const validCount = importData.filter(r => r.isValid).length;
  const invalidCount = importData.filter(r => !r.isValid).length;

  const formatLastActionDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card text-card-foreground border-black max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">ADICIONAR PROFISSIONAIS EM MASSA</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {!importComplete ? (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="border border-black/20 p-4 space-y-3">
                <h3 className="text-sm font-medium">Estrutura dos dados:</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Campos obrigatórios:</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      <li>• <strong>Nome</strong> - Nome completo</li>
                      <li>• <strong>Tipo</strong> - Tipo do profissional</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Campos opcionais:</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      <li>• <strong>Consultor</strong> - Responsável</li>
                      <li>• <strong>Data da Última Ação</strong> - Para categorização</li>
                      <li>• <strong>Última Ação</strong> - Tipo da última ação</li>
                    </ul>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs mt-2 pt-2 border-t border-black/10">
                  <div>
                    <span className="text-muted-foreground font-medium">Tipos disponíveis:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {professionalTypes.map(t => (
                        <span key={t.id} className="bg-muted px-1.5 py-0.5 text-[10px]">{t.name}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">Consultores ativos:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activeMembers.map(m => (
                        <span key={m.id} className="bg-muted px-1.5 py-0.5 text-[10px]">{m.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs for input method */}
              <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v as 'manual' | 'file');
                setImportData([]);
              }}>
                <TabsList className="w-full grid grid-cols-2 bg-muted">
                  <TabsTrigger value="manual" className="flex items-center gap-2 data-[state=active]:bg-card-foreground data-[state=active]:text-card">
                    <ClipboardList className="w-4 h-4" />
                    Listagem Manual
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex items-center gap-2 data-[state=active]:bg-card-foreground data-[state=active]:text-card">
                    <FileUp className="w-4 h-4" />
                    Importar Arquivo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                      Cole a lista de profissionais (um por linha, separado por vírgula, tab ou ponto e vírgula)
                    </label>
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Nome, Tipo, Consultor, Data Última Ação, Última Ação
João Silva, Arquiteto, Maria Santos, 15/01/2025, Visita
Ana Costa, Designer
Pedro Lima, Engenheiro, Carlos Souza"
                      className="input-flat w-full h-32 text-sm font-mono resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Formato: Nome, Tipo, Consultor (opcional), Data (opcional), Ação (opcional)
                    </p>
                  </div>
                  <button
                    onClick={handleManualParse}
                    disabled={!manualText.trim()}
                    className="btn-secondary border-card-foreground text-card-foreground disabled:opacity-40"
                  >
                    Validar Dados
                  </button>
                </TabsContent>

                <TabsContent value="file" className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="bulk-file-upload"
                    />
                    <label
                      htmlFor="bulk-file-upload"
                      className="btn-secondary border-card-foreground text-card-foreground flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Selecionar Arquivo (.CSV ou .XLSX)
                    </label>
                    {importData.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {importData.length} linha(s) encontrada(s)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Colunas do arquivo: Nome, Tipo, Consultor, Data da Última Ação, Última Ação
                  </p>
                </TabsContent>
              </Tabs>

              {/* Preview */}
              {importData.length > 0 && (
                <div className="space-y-3 mt-4 pt-4 border-t border-black/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Pré-visualização</h4>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        <Check className="w-4 h-4 inline text-green-600 mr-1" />
                        {validCount} válido(s)
                      </span>
                      {invalidCount > 0 && (
                        <span className="text-sm text-destructive">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          {invalidCount} com erro(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-black overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr className="border-b border-black">
                          <th className="text-left p-2 w-8"></th>
                          <th className="text-left p-2">Nome</th>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Consultor</th>
                          <th className="text-left p-2">Últ. Ação</th>
                          <th className="text-left p-2">Data</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map((row, idx) => (
                          <tr key={idx} className={`border-b border-black/10 ${!row.isValid ? 'bg-destructive/10' : ''}`}>
                            <td className="p-2">
                              {row.isValid ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <X className="w-3 h-3 text-destructive" />
                              )}
                            </td>
                            <td className="p-2 font-medium">{row.name || '-'}</td>
                            <td className="p-2">{row.typeName || '-'}</td>
                            <td className="p-2">{row.consultantName || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="p-2">{row.lastActionName || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="p-2">{formatLastActionDate(row.lastActionDate)}</td>
                            <td className="p-2">
                              {row.errors.length > 0 ? (
                                <span className="text-destructive text-[10px]">{row.errors.join(', ')}</span>
                              ) : (
                                <span className="text-green-600">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {invalidCount > 0 && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Linhas com erro serão ignoradas durante a importação.
                    </p>
                  )}

                  <button
                    onClick={handleImport}
                    disabled={validCount === 0 || isProcessing}
                    className="btn-primary w-full bg-card-foreground text-card disabled:opacity-40"
                  >
                    {isProcessing ? 'Importando...' : `Confirmar Cadastro de ${validCount} Profissional(is)`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-green-600 opacity-50" />
              <h3 className="text-lg mb-2">Importação Concluída!</h3>
              <p className="text-muted-foreground">
                {importedCount} profissional(is) cadastrado(s) com sucesso.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                A categorização automática foi aplicada baseada nas datas de última ação informadas.
              </p>
              <button onClick={handleClose} className="btn-primary mt-6 bg-card-foreground text-card">
                Fechar
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
