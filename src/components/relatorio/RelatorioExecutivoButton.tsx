/**
 * RelatorioExecutivoButton
 *
 * FASE 3 — Botão de exportação do relatório executivo.
 * Coloque este componente na página de Indicadores Comerciais ou no Dashboard admin.
 *
 * Uso:
 *   import { RelatorioExecutivoButton } from '@/components/relatorio/RelatorioExecutivoButton';
 *   <RelatorioExecutivoButton year={2026} month={4} />
 */

import { useState } from 'react';
import { FileDown, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useRelatorioExecutivo } from '@/hooks/useRelatorioExecutivo';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  year: number;
  month: number;
  variant?: 'default' | 'outline' | 'ghost';
}

// Últimos 6 meses para seleção rápida
function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: format(d, "MMMM 'de' yyyy", { locale: ptBR }) });
  }
  return months;
}

export function RelatorioExecutivoButton({ year, month, variant = 'outline' }: Props) {
  const { gerarRelatorio, isGenerating } = useRelatorioExecutivo();
  const months = getLast6Months();

  const handleExport = async (y: number, m: number, label: string) => {
    try {
      await gerarRelatorio({ year: y, month: m });
      toast.success(`Relatório de ${label} exportado com sucesso`);
    } catch (err) {
      toast.error('Erro ao gerar relatório', { description: String(err) });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {isGenerating ? 'Gerando...' : 'Relatório Executivo'}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {months.map(m => (
          <DropdownMenuItem
            key={`${m.year}-${m.month}`}
            onClick={() => handleExport(m.year, m.month, m.label)}
            className="capitalize"
          >
            {m.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
