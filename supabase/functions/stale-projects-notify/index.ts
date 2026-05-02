/**
 * Edge Function: stale-projects-notify
 *
 * FASE 3 — Alertas automáticos de projetos parados
 *
 * Roda diariamente via pg_cron (configurado na migration abaixo).
 * Para cada consultor com projetos parados (sem Apresentação há 90+ dias),
 * envia um email de alerta com a lista de projetos.
 *
 * Como ativar:
 *   1. Deploy: supabase functions deploy stale-projects-notify
 *   2. Configurar secrets no Supabase Dashboard:
 *      - RESEND_API_KEY  (https://resend.com — plano gratuito: 3000 emails/mês)
 *      - NOTIFY_FROM_EMAIL (ex: noreply@evvivago.com.br)
 *      - ADMIN_EMAIL (email da gestora para o resumo diário)
 *   3. A migration cria o cron automático às 8h (horário de Brasília)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STALE_DAYS = 90;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('NOTIFY_FROM_EMAIL') ?? 'noreply@evvivago.com.br';
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface StaleProject {
  projectId: string;
  clientName: string | null;
  foccoNumber: string | null;
  lastApresentacaoDate: string;
  daysSince: number;
}

interface ConsultantAlert {
  consultantId: string;
  consultantName: string;
  email: string | null;
  staleProjects: StaleProject[];
}

Deno.serve(async (_req) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - STALE_DAYS);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    // 1. Buscar tipos de ação de "Apresentação de Projeto"
    const { data: actionTypes } = await supabase.from('action_types').select('id, name');
    const apresentacaoIds = (actionTypes || [])
      .filter(t => t.name.toLowerCase().includes('apresenta') && t.name.toLowerCase().includes('projeto'))
      .map(t => t.id);

    if (apresentacaoIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'Nenhum tipo de ação encontrado' }), { status: 200 });
    }

    // 2. Buscar projetos em negociação
    const { data: projects } = await supabase
      .from('projects')
      .select('id, focco_project_number, responsible_id, client_id, clients(name)')
      .not('stage', 'in', '(closed_won,closed_lost)')
      .not('responsible_id', 'is', null);

    if (!projects?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'Nenhum projeto em negociação' }), { status: 200 });
    }

    const projectIds = projects.map(p => p.id);

    // 3. Última apresentação por projeto
    const { data: actions } = await supabase
      .from('actions')
      .select('project_id, action_date')
      .in('project_id', projectIds)
      .in('action_type_id', apresentacaoIds)
      .order('action_date', { ascending: false });

    const lastByProject = new Map<string, string>();
    (actions || []).forEach(a => {
      if (a.project_id && !lastByProject.has(a.project_id)) {
        lastByProject.set(a.project_id, a.action_date);
      }
    });

    // 4. Snoozes ativos
    const { data: snoozes } = await supabase
      .from('project_review_snoozes')
      .select('project_id')
      .gte('snoozed_until', today);
    const snoozedSet = new Set((snoozes || []).map(s => s.project_id));

    // 5. Identificar projetos parados por consultor
    const byConsultant = new Map<string, StaleProject[]>();
    const now = new Date();

    projects.forEach(p => {
      if (snoozedSet.has(p.id) || !p.responsible_id) return;
      const lastDate = lastByProject.get(p.id);
      if (!lastDate) return;
      const days = Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days < STALE_DAYS) return;

      const entry: StaleProject = {
        projectId: p.id,
        clientName: (p.clients as any)?.name || null,
        foccoNumber: p.focco_project_number,
        lastApresentacaoDate: lastDate,
        daysSince: days,
      };

      if (!byConsultant.has(p.responsible_id)) byConsultant.set(p.responsible_id, []);
      byConsultant.get(p.responsible_id)!.push(entry);
    });

    if (byConsultant.size === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'Nenhum projeto parado encontrado' }), { status: 200 });
    }

    // 6. Buscar dados dos consultores (nome + email via auth.users)
    const consultantIds = Array.from(byConsultant.keys());
    const { data: members } = await supabase
      .from('team_members')
      .select('id, name, user_id')
      .in('id', consultantIds);

    const memberMap = new Map((members || []).map(m => [m.id, m]));

    // Buscar emails via auth admin
    const alerts: ConsultantAlert[] = [];
    for (const [consultantId, staleProjects] of byConsultant) {
      const member = memberMap.get(consultantId);
      if (!member) continue;

      let email: string | null = null;
      if (member.user_id) {
        const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
        email = userData?.user?.email || null;
      }

      alerts.push({
        consultantId,
        consultantName: member.name,
        email,
        staleProjects: staleProjects.sort((a, b) => b.daysSince - a.daysSince),
      });
    }

    // 7. Enviar emails (Resend)
    const emailResults: string[] = [];

    if (RESEND_API_KEY) {
      for (const alert of alerts) {
        if (!alert.email) continue;

        const projectLines = alert.staleProjects.map(p => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${p.clientName || '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${p.foccoNumber || '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${p.lastApresentacaoDate}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#b45309;font-weight:600">${p.daysSince} dias</td>
          </tr>`).join('');

        const html = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0">
              <h1 style="color:#c8a96e;margin:0;font-size:20px">Evvivago · Programa E+</h1>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #eee;border-top:none">
              <p style="color:#333">Olá, <strong>${alert.consultantName}</strong>!</p>
              <p style="color:#555">Você tem <strong>${alert.staleProjects.length} projeto(s)</strong> sem nova Apresentação de Projeto há mais de ${STALE_DAYS} dias. Por favor, atualize o status no sistema.</p>
              <table style="width:100%;border-collapse:collapse;margin-top:16px">
                <thead>
                  <tr style="background:#f8f8f8">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase">Cliente</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase">FOCCO</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase">Última Apres.</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase">Tempo</th>
                  </tr>
                </thead>
                <tbody>${projectLines}</tbody>
              </table>
              <div style="margin-top:24px;text-align:center">
                <a href="${SUPABASE_URL.replace('supabase.co', 'evvivago.com.br') || '#'}/minha-area" 
                   style="background:#c8a96e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
                  Acessar o Sistema
                </a>
              </div>
              <p style="color:#999;font-size:12px;margin-top:24px">Este é um alerta automático do Programa E+ · Evvivago · Evviva Bertolini</p>
            </div>
          </div>`;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `Evvivago <${FROM_EMAIL}>`,
            to: [alert.email],
            subject: `⚠ ${alert.staleProjects.length} projeto(s) aguardando atualização — Evvivago`,
            html,
          }),
        });

        emailResults.push(`${alert.consultantName}: ${res.ok ? 'enviado' : 'erro'}`);
      }

      // 8. Resumo para a gestora
      if (ADMIN_EMAIL) {
        const summaryRows = alerts.map(a => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${a.consultantName}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${a.staleProjects.length}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${a.staleProjects.map(p => p.clientName || p.foccoNumber || p.projectId).join(', ')}</td>
          </tr>`).join('');

        const adminHtml = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0">
              <h1 style="color:#c8a96e;margin:0;font-size:20px">Evvivago · Resumo Diário — Projetos Parados</h1>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #eee;border-top:none">
              <p style="color:#333">Resumo automático de <strong>${today}</strong>:</p>
              <p style="color:#555"><strong>${alerts.reduce((s, a) => s + a.staleProjects.length, 0)} projeto(s)</strong> parado(s) em <strong>${alerts.length} consultor(es)</strong> foram identificados e notificados.</p>
              <table style="width:100%;border-collapse:collapse;margin-top:16px">
                <thead>
                  <tr style="background:#f8f8f8">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase">Consultor</th>
                    <th style="padding:10px 12px;text-align:center;font-size:12px;color:#666;text-transform:uppercase">Qtd</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase">Projetos</th>
                  </tr>
                </thead>
                <tbody>${summaryRows}</tbody>
              </table>
            </div>
          </div>`;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `Evvivago <${FROM_EMAIL}>`,
            to: [ADMIN_EMAIL],
            subject: `📊 Resumo diário — ${alerts.reduce((s, a) => s + a.staleProjects.length, 0)} projeto(s) parado(s) · ${today}`,
            html: adminHtml,
          }),
        });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      alertsSent: alerts.length,
      totalStaleProjects: alerts.reduce((s, a) => s + a.staleProjects.length, 0),
      emailResults,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('stale-projects-notify error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
