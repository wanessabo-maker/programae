import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, AlertCircle, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '@/contexts/AppContext';

interface ImportProfessionalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  name: string;
  typeName: string;
  consultantName: string;
  isValid: boolean;
  errors: string[];
  typeId?: string;
  consultantId?: string;
}

export function ImportProfessionalsModal({ open, onOpenChange }: ImportProfessionalsModalProps) {
  const { professionalTypes, teamMembers, professionalCategories, addProfessional } = useApp();
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMembers = teamMembers.filter(m => m.active);

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

        const processedData: ImportRow[] = jsonData.map((row) => {
          const name = (row['Nome'] || row['nome'] || row['NOME'] || '').toString().trim();
          const typeName = (row['Tipo'] || row['tipo'] || row['TIPO'] || '').toString().trim();
          const consultantName = (row['Consultor'] || row['consultor'] || row['CONSULTOR'] || '').toString().trim();

          const errors: string[] = [];
          
          if (!name) errors.push('Nome obrigatório');
          
          const matchedType = professionalTypes.find(
            t => t.name.toLowerCase() === typeName.toLowerCase()
          );
          if (!typeName) {
            errors.push('Tipo obrigatório');
          } else if (!matchedType) {
            errors.push(`Tipo "${typeName}" não encontrado`);
          }

          const matchedConsultant = activeMembers.find(
            m => m.name.toLowerCase() === consultantName.toLowerCase()
          );
          if (!consultantName) {
            errors.push('Consultor obrigatório');
          } else if (!matchedConsultant) {
            errors.push(`Consultor "${consultantName}" não encontrado`);
          }

          return {
            name,
            typeName,
            consultantName,
            isValid: errors.length === 0,
            errors,
            typeId: matchedType?.id,
            consultantId: matchedConsultant?.id,
          };
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

  const handleImport = async () => {
    const validRows = importData.filter(row => row.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    let count = 0;

    const defaultCategoryId = professionalCategories[professionalCategories.length - 1]?.id || '';

    for (const row of validRows) {
      if (row.typeId && row.consultantId) {
        await addProfessional({
          name: row.name,
          typeId: row.typeId,
          consultantId: row.consultantId,
          categoryId: defaultCategoryId,
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
    setImportComplete(false);
    setImportedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const validCount = importData.filter(r => r.isValid).length;
  const invalidCount = importData.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card text-card-foreground border-black max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>IMPORTAR PROFISSIONAIS</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          {!importComplete ? (
            <>
              {/* Instructions */}
              <div className="border border-black/20 p-4 space-y-2">
                <h3 className="text-sm font-medium">Formato do arquivo:</h3>
                <p className="text-xs text-muted-foreground">
                  O arquivo Excel ou CSV deve ter as colunas: <strong>Nome</strong>, <strong>Tipo</strong>, <strong>Consultor</strong>
                </p>
                <div className="flex flex-wrap gap-4 text-xs mt-3">
                  <div>
                    <span className="text-muted-foreground">Tipos disponíveis:</span>
                    <ul className="mt-1">
                      {professionalTypes.map(t => (
                        <li key={t.id} className="text-muted-foreground">• {t.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consultores ativos:</span>
                    <ul className="mt-1">
                      {activeMembers.map(m => (
                        <li key={m.id} className="text-muted-foreground">• {m.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="btn-secondary border-card-foreground text-card-foreground flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Selecionar Arquivo
                </label>
                {importData.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {importData.length} linha(s) encontrada(s)
                  </span>
                )}
              </div>

              {/* Preview */}
              {importData.length > 0 && (
                <>
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

                  <div className="border border-black overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr className="border-b border-black">
                          <th className="text-left p-2"></th>
                          <th className="text-left p-2">Nome</th>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Consultor</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map((row, idx) => (
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
                            <td className="p-2">{row.consultantName || '-'}</td>
                            <td className="p-2 text-xs">
                              {row.errors.length > 0 ? (
                                <span className="text-destructive">{row.errors.join(', ')}</span>
                              ) : (
                                <span className="text-success">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleImport}
                    disabled={validCount === 0 || isProcessing}
                    className="btn-primary w-full bg-card-foreground text-card disabled:opacity-40"
                  >
                    {isProcessing ? 'Importando...' : `Importar ${validCount} Profissional(is)`}
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-success opacity-50" />
              <h3 className="text-lg mb-2">Importação Concluída!</h3>
              <p className="text-muted-foreground">
                {importedCount} profissional(is) importado(s) com sucesso.
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