import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, Check, X, Users, ClipboardList } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '@/contexts/AppContext';
import { parseISO, isValid, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

interface ImportRow {
  name: string;
  typeName: string;
  consultantName: string;
  lastActionDate: string;
  lastActionName: string;
  isValid: boolean;
  errors: string[];
  typeId?: string;
  consultantId?: string;
  calculatedCategoryId?: string;
  lastActionTypeId?: string;
}

type InputMode = 'file' | 'manual' | null;

export function BulkProfessionalsTab() {
  const { 
    professionalTypes, 
    teamMembers, 
    professionalCategories, 
    actionTypes,
    addProfessional 
  } = useApp();
  
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [manualText, setManualText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMembers = teamMembers.filter(m => m.active);
  const sortedCategories = [...professionalCategories].sort((a, b) => a.order - b.order);
  const lowestCategory = sortedCategories[sortedCategories.length - 1];

  const findCategoryByAction = (actionTypeName: string, lastActionDateStr: string): { categoryId: string; actionTypeId: string | undefined } => {
    if (!actionTypeName || !lastActionDateStr) {
      return { categoryId: lowestCategory?.id || '', actionTypeId: undefined };
    }

    const actionType = actionTypes.find(
      at => at.name.toLowerCase() === actionTypeName.toLowerCase()
    );

    if (!actionType) {
      return { categoryId: lowestCategory?.id || '', actionTypeId: undefined };
    }

    const lastActionDate = parseISO(lastActionDateStr);
    if (!isValid(lastActionDate)) {
      return { categoryId: lowestCategory?.id || '', actionTypeId: actionType.id };
    }

    const daysSinceAction = differenceInDays(new Date(), lastActionDate);

    // Find category matching action classification
    const matchingCategoryIndex = sortedCategories.findIndex(
      cat => cat.condition === actionType.classification
    );

    if (matchingCategoryIndex === -1) {
      return { categoryId: lowestCategory?.id || '', actionTypeId: actionType.id };
    }

    // Check if still within matching category's days
    const matchingCategory = sortedCategories[matchingCategoryIndex];
    if (daysSinceAction < matchingCategory.daysToChange) {
      return { categoryId: matchingCategory.id, actionTypeId: actionType.id };
    }

    // Fall through lower categories
    let accumulatedDays = matchingCategory.daysToChange;
    for (let i = matchingCategoryIndex + 1; i < sortedCategories.length; i++) {
      const category = sortedCategories[i];
      accumulatedDays += category.daysToChange;
      if (daysSinceAction < accumulatedDays) {
        return { categoryId: category.id, actionTypeId: actionType.id };
      }
    }

    return { categoryId: lowestCategory?.id || '', actionTypeId: actionType.id };
  };

  const processRow = (row: Record<string, string>): ImportRow => {
    const name = (row['Nome'] || row['nome'] || row['NOME'] || '').toString().trim();
    const typeName = (row['Tipo'] || row['tipo'] || row['TIPO'] || '').toString().trim();
    const consultantName = (row['Consultor'] || row['consultor'] || row['CONSULTOR'] || '').toString().trim();
    const lastActionDate = (row['Data da Última Ação'] || row['data da última ação'] || row['DATA DA ÚLTIMA AÇÃO'] || 
                           row['Data da Ultima Acao'] || row['data da ultima acao'] || '').toString().trim();
    const lastActionName = (row['Última Ação'] || row['última ação'] || row['ÚLTIMA AÇÃO'] || 
                           row['Ultima Acao'] || row['ultima acao'] || '').toString().trim();

    const errors: string[] = [];

    // Validate required fields
    if (!name) errors.push('Nome obrigatório');

    const matchedType = professionalTypes.find(
      t => t.name.toLowerCase() === typeName.toLowerCase()
    );
    if (!typeName) {
      errors.push('Tipo obrigatório');
    } else if (!matchedType) {
      errors.push(`Tipo "${typeName}" não encontrado`);
    }

    // Optional consultant validation
    let matchedConsultant = undefined;
    if (consultantName) {
      matchedConsultant = activeMembers.find(
        m => m.name.toLowerCase() === consultantName.toLowerCase()
      );
      if (!matchedConsultant) {
        errors.push(`Consultor "${consultantName}" não encontrado`);
      }
    }

    // Optional date validation
    let parsedDate = '';
    if (lastActionDate) {
      // Try different date formats
      let dateObj: Date | null = null;
      
      // Try ISO format first
      dateObj = parseISO(lastActionDate);
      
      // Try DD/MM/YYYY format
      if (!isValid(dateObj)) {
        const parts = lastActionDate.split(/[\/\-]/);
        if (parts.length === 3) {
          const [day, month, year] = parts;
          dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }

      if (isValid(dateObj)) {
        parsedDate = dateObj.toISOString().split('T')[0];
      } else {
        errors.push(`Data "${lastActionDate}" inválida`);
      }
    }

    // Calculate category based on action and date
    const { categoryId, actionTypeId } = findCategoryByAction(lastActionName, parsedDate);

    return {
      name,
      typeName,
      consultantName,
      lastActionDate: parsedDate,
      lastActionName,
      isValid: errors.length === 0,
      errors,
      typeId: matchedType?.id,
      consultantId: matchedConsultant?.id,
      calculatedCategoryId: categoryId,
      lastActionTypeId: actionTypeId,
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
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        const processedData = jsonData.map(row => processRow(row));
        setImportData(processedData);
        setImportComplete(false);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Erro ao ler o arquivo. Verifique se é um arquivo Excel ou CSV válido.');
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
      
      // Try to parse as tab-separated or comma-separated
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      
      if (parts.length >= 2) {
        const row: Record<string, string> = {
          Nome: parts[0]?.trim() || '',
          Tipo: parts[1]?.trim() || '',
          Consultor: parts[2]?.trim() || '',
          'Data da Última Ação': parts[3]?.trim() || '',
          'Última Ação': parts[4]?.trim() || '',
        };
        processedData.push(processRow(row));
      } else {
        // Single column - just name, mark as invalid
        processedData.push({
          name: parts[0]?.trim() || '',
          typeName: '',
          consultantName: '',
          lastActionDate: '',
          lastActionName: '',
          isValid: false,
          errors: ['Tipo obrigatório'],
        });
      }
    }

    setImportData(processedData);
    setImportComplete(false);
  };

  const handleImport = async () => {
    if (professionalCategories.length === 0) {
      toast.error('Configure pelo menos uma categoria antes de importar profissionais.');
      return;
    }

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
          categoryId: row.calculatedCategoryId || lowestCategory?.id || '',
          lastActionDate: row.lastActionDate || undefined,
          lastActionTypeId: row.lastActionTypeId,
        });
        count++;
      }
    }

    setImportedCount(count);
    setImportComplete(true);
    setIsProcessing(false);
    toast.success(`${count} profissional(is) importado(s) com sucesso!`);
  };

  const handleReset = () => {
    setInputMode(null);
    setImportData([]);
    setManualText('');
    setImportComplete(false);
    setImportedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = importData.filter(r => r.isValid).length;
  const invalidCount = importData.filter(r => !r.isValid).length;

  if (importComplete) {
    return (
      <div className="text-center py-8">
        <Users className="w-16 h-16 mx-auto mb-4 text-success opacity-50" />
        <h3 className="text-lg mb-2">Importação Concluída!</h3>
        <p className="text-muted-foreground mb-6">
          {importedCount} profissional(is) cadastrado(s) com sucesso.
        </p>
        <button onClick={handleReset} className="btn-primary bg-card-foreground text-card">
          Nova Importação
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="border border-black/20 p-4 space-y-3">
        <h3 className="text-sm font-medium">Estrutura dos Dados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-medium mb-1 text-success">Campos Obrigatórios:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• <strong>Nome</strong> - Nome do profissional</li>
              <li>• <strong>Tipo</strong> - Categoria profissional</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1 text-muted-foreground">Campos Opcionais:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• <strong>Consultor</strong> - Responsável</li>
              <li>• <strong>Data da Última Ação</strong> - Para categorização</li>
              <li>• <strong>Última Ação</strong> - Tipo da ação realizada</li>
            </ul>
          </div>
        </div>
        <div className="pt-3 border-t border-black/10 text-xs text-muted-foreground">
          <p>💡 A data da última ação é usada para classificar automaticamente o profissional na categoria correta baseado nas regras do sistema.</p>
        </div>
      </div>

      {/* Mode Selection */}
      {!inputMode && importData.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setInputMode('file')}
            className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-black/20 hover:border-black/50 transition-colors"
          >
            <Upload className="w-8 h-8 opacity-60" />
            <div className="text-center">
              <p className="font-medium">Importar Arquivo</p>
              <p className="text-xs text-muted-foreground">CSV ou Excel (.xlsx)</p>
            </div>
          </button>
          <button
            onClick={() => setInputMode('manual')}
            className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-black/20 hover:border-black/50 transition-colors"
          >
            <ClipboardList className="w-8 h-8 opacity-60" />
            <div className="text-center">
              <p className="font-medium">Adicionar por Lista</p>
              <p className="text-xs text-muted-foreground">Colar dados diretamente</p>
            </div>
          </button>
        </div>
      )}

      {/* File Upload Mode */}
      {inputMode === 'file' && importData.length === 0 && (
        <div className="space-y-4">
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
              className="btn-primary bg-card-foreground text-card flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Selecionar Arquivo
            </label>
            <button onClick={handleReset} className="btn-secondary border-card-foreground text-card-foreground">
              Voltar
            </button>
          </div>
          
          {/* Available options reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border border-black/10 p-3">
            <div>
              <span className="text-muted-foreground font-medium">Tipos disponíveis:</span>
              <ul className="mt-1 text-muted-foreground">
                {professionalTypes.map(t => <li key={t.id}>• {t.name}</li>)}
                {professionalTypes.length === 0 && <li className="text-destructive">Nenhum tipo cadastrado</li>}
              </ul>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Consultores ativos:</span>
              <ul className="mt-1 text-muted-foreground">
                {activeMembers.map(m => <li key={m.id}>• {m.name}</li>)}
                {activeMembers.length === 0 && <li className="text-destructive">Nenhum consultor ativo</li>}
              </ul>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Tipos de Ação:</span>
              <ul className="mt-1 text-muted-foreground">
                {actionTypes.map(a => <li key={a.id}>• {a.name}</li>)}
                {actionTypes.length === 0 && <li className="text-muted-foreground italic">Opcional</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Mode */}
      {inputMode === 'manual' && importData.length === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Cole os dados abaixo (separados por vírgula ou tab):
            </label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Nome, Tipo, Consultor, Data da Última Ação, Última Ação
João Silva, Arquiteto, Maria Santos, 2024-01-15, Visita
Ana Costa, Designer, Pedro Lima, , "
              className="input-flat w-full h-40 text-sm text-card-foreground font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleManualParse} className="btn-primary bg-card-foreground text-card flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Validar Dados
            </button>
            <button onClick={handleReset} className="btn-secondary border-card-foreground text-card-foreground">
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {importData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm">
                <Check className="w-4 h-4 inline text-success mr-1" />
                {validCount} válido(s)
              </span>
              {invalidCount > 0 && (
                <span className="text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  {invalidCount} com erro(s)
                </span>
              )}
            </div>
            <button onClick={handleReset} className="text-sm text-muted-foreground hover:text-card-foreground">
              Limpar
            </button>
          </div>

          <div className="border border-black overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr className="border-b border-black">
                  <th className="text-left p-2 w-8"></th>
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Consultor</th>
                  <th className="text-left p-2">Data Ação</th>
                  <th className="text-left p-2">Categoria</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {importData.map((row, idx) => {
                  const category = professionalCategories.find(c => c.id === row.calculatedCategoryId);
                  return (
                    <tr key={idx} className={`border-b border-black/10 ${!row.isValid ? 'bg-destructive/10' : ''}`}>
                      <td className="p-2">
                        {row.isValid ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <X className="w-4 h-4 text-destructive" />
                        )}
                      </td>
                      <td className="p-2">{row.name || '-'}</td>
                      <td className="p-2">{row.typeName || '-'}</td>
                      <td className="p-2">{row.consultantName || <span className="text-muted-foreground">-</span>}</td>
                      <td className="p-2">{row.lastActionDate || <span className="text-muted-foreground">-</span>}</td>
                      <td className="p-2">
                        {category ? (
                          <span className="text-xs bg-muted px-2 py-0.5">{category.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2 text-xs">
                        {row.errors.length > 0 ? (
                          <span className="text-destructive">{row.errors.join(', ')}</span>
                        ) : (
                          <span className="text-success">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={validCount === 0 || isProcessing}
            className="btn-primary w-full bg-card-foreground text-card disabled:opacity-40"
          >
            {isProcessing ? 'Cadastrando...' : `Confirmar Cadastro de ${validCount} Profissional(is)`}
          </button>
        </div>
      )}
    </div>
  );
}
