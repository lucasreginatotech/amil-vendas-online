// CRM privado: autenticação, resumo visual, filtros, edição, exclusão e exportação.
(() => {
  const loginPanel = document.querySelector('#loginPanel');
  const dashboard = document.querySelector('#dashboard');
  const mobileNav = document.querySelector('#mobileNav');
  const crmActions = document.querySelector('#crmActions');
  const loginForm = document.querySelector('#loginForm');
  const loginMessage = document.querySelector('#loginMessage');
  const dashboardMessage = document.querySelector('#dashboardMessage');
  const leadList = document.querySelector('#leadList');
  const emptyState = document.querySelector('#emptyState');
  const search = document.querySelector('#searchLeads');
  const statuses = ['Novo', 'Em contato', 'Cotação enviada', 'Fechado', 'Perdido'];
  let leads = [];
  let statusFilter = 'Todos';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const formatDate = (value) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Carrega os leads da API protegida e atualiza o painel.
  async function loadLeads() {
    const response = await fetch('/api/crm-leads', { cache: 'no-store' });
    if (response.status === 401) return showLogin();
    if (!response.ok) throw new Error('Não consegui carregar os leads. Tente atualizar a página.');
    const data = await response.json();
    leads = data.leads || [];
    loginPanel.hidden = true;
    dashboard.hidden = false;
    crmActions.hidden = false;
    mobileNav.hidden = false;
    document.querySelector('#todayDate').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
    document.querySelector('#lastUpdated').textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    renderDashboard();
  }

  function showLogin() {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    crmActions.hidden = true;
    mobileNav.hidden = true;
  }

  // Atualiza os cartões e os dois gráficos sem depender de biblioteca externa.
  function renderOverview() {
    const count = (status) => leads.filter((lead) => lead.status === status).length;
    document.querySelector('#totalLeads').textContent = String(leads.length);
    document.querySelector('#newLeads').textContent = String(count('Novo'));
    document.querySelector('#activeLeads').textContent = String(count('Em contato') + count('Cotação enviada'));
    document.querySelector('#wonLeads').textContent = String(count('Fechado'));
    document.querySelector('#whatsappClicks').textContent = String(leads.filter((lead) => lead.source === 'whatsapp').length);
    document.querySelector('#pipelineTotal').textContent = `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`;

    const pipeline = document.querySelector('#pipelineChart');
    pipeline.innerHTML = statuses.map((status) => {
      const amount = count(status);
      const percent = leads.length ? Math.round((amount / leads.length) * 100) : 0;
      return `<div class="pipeline-row"><div class="pipeline-label"><span>${escapeHtml(status)}</span><b>${amount}</b></div><div class="pipeline-track"><i class="pipeline-fill status-${statuses.indexOf(status)}" style="width:${percent}%"></i></div></div>`;
    }).join('');

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const amount = leads.filter((lead) => {
        const received = new Date(lead.created_at);
        return received >= date && received < nextDate;
      }).length;
      return { label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), amount };
    });
    const peak = Math.max(1, ...days.map((day) => day.amount));
    document.querySelector('#weekChart').innerHTML = days.map((day) => {
      const height = day.amount ? Math.max(12, Math.round((day.amount / peak) * 100)) : 5;
      return `<div class="week-column" title="${day.amount} ${day.amount === 1 ? 'lead' : 'leads'}"><span class="week-value">${day.amount || ''}</span><i style="height:${height}%"></i><small>${escapeHtml(day.label)}</small></div>`;
    }).join('');
  }

  // Monta os cartões, que se reorganizam em uma coluna no celular.
  function renderLeads() {
    const query = search.value.trim().toLocaleLowerCase('pt-BR');
    const visible = leads.filter((lead) => {
      const matchesQuery = [lead.name, lead.email, lead.phone, lead.plan, lead.city, lead.state, lead.source, lead.source_detail].join(' ').toLocaleLowerCase('pt-BR').includes(query);
      return matchesQuery && (statusFilter === 'Todos' || lead.status === statusFilter);
    });

    document.querySelector('#tabLeadCount').textContent = String(leads.length);
    document.querySelector('#mobileLeadCount').textContent = String(leads.length);
    document.querySelector('#filterAllCount').textContent = String(leads.length);
    document.querySelector('#filterNewCount').textContent = String(leads.filter((lead) => lead.status === 'Novo').length);
    document.querySelector('#visibleLeadCount').textContent = `${visible.length} de ${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`;
    emptyState.hidden = visible.length > 0;

    leadList.innerHTML = visible.map((lead) => {
      const options = statuses.map((status) => `<option value="${escapeHtml(status)}" ${lead.status === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('');
      const phoneDigits = String(lead.phone || '').replace(/\D/g, '');
      const whatsappDigits = phoneDigits.length === 10 || phoneDigits.length === 11 ? `55${phoneDigits}` : phoneDigits;
      const whatsappUrl = /^\d{12,15}$/.test(whatsappDigits) ? `https://wa.me/${whatsappDigits}` : '';
      const directWhatsapp = lead.source === 'whatsapp';
      const leadName = lead.name || 'Lead sem nome';
      const location = lead.city && lead.state ? `${lead.city} - ${lead.state}` : 'Região não informada';
      const initial = String(leadName).trim().charAt(0).toLocaleUpperCase('pt-BR');
      const contactInfo = lead.phone || lead.email
        ? `${lead.phone ? `<a href="tel:${escapeHtml(phoneDigits)}">${escapeHtml(lead.phone)}</a>` : ''}${lead.email ? `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>` : ''}`
        : '<span class="contact-missing">Sem telefone ou e-mail — clicou para abrir o WhatsApp</span>';
      const interest = directWhatsapp
        ? 'O visitante ainda não enviou os dados de contato.'
        : `${escapeHtml(lead.lives)} ${Number(lead.lives) === 1 ? 'vida' : 'vidas'}`;
      return `<article class="lead-card" data-id="${escapeHtml(lead.id)}">
        <div class="lead-card-top"><span class="lead-avatar">${escapeHtml(initial)}</span><div class="lead-identity"><strong>${escapeHtml(leadName)}</strong><span>${escapeHtml(location)}</span></div><span class="status-badge status-badge-${statuses.indexOf(lead.status)}">${escapeHtml(lead.status)}</span></div>
        <div class="lead-origin ${directWhatsapp ? 'origin-whatsapp' : 'origin-form'}"><b>${directWhatsapp ? 'Clique direto no WhatsApp' : 'Formulário de cotação'}</b>${lead.source_detail ? `<small>${escapeHtml(lead.source_detail)}</small>` : ''}</div>
        <div class="lead-contact">${contactInfo}</div>
        <div class="lead-interest"><span>INTERESSE</span><strong>${escapeHtml(lead.plan || 'Cotação de plano Amil')}</strong><small>${interest}</small></div>
        <div class="lead-card-meta"><span>Recebido ${escapeHtml(formatDate(lead.created_at))}</span><button class="delete-lead" type="button" aria-label="Excluir lead de ${escapeHtml(lead.name)}" title="Excluir lead">Excluir</button></div>
        <details class="lead-notes"><summary>${lead.notes ? 'Ver / editar anotação' : 'Adicionar anotação'}</summary><textarea class="notes-input" maxlength="5000" placeholder="Ex.: chamar amanhã às 10h">${escapeHtml(lead.notes || '')}</textarea></details>
        <div class="lead-card-bottom"><label class="status-field"><span>Etapa do atendimento</span><select class="status-select" aria-label="Etapa do atendimento">${options}</select></label><div class="lead-buttons">${whatsappUrl ? `<a class="contact-lead" href="${whatsappUrl}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>` : ''}<button class="save-lead" type="button">Salvar</button></div></div>
      </article>`;
    }).join('');
  }

  function renderDashboard() {
    renderOverview();
    renderLeads();
  }

  // Alterna entre o resumo e a lista, mantendo estado acessível para teclado.
  function setTab(tab) {
    document.querySelectorAll('[data-tab]').forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle('is-active', active);
      if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active));
      if (button.classList.contains('mobile-nav-button')) {
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      }
    });
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      const active = panel.dataset.panel === tab;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Baixa todos os leads em CSV compatível com Excel em português.
  function exportCsv() {
    const headers = ['Recebido em', 'Origem', 'Detalhe da origem', 'Nome', 'E-mail', 'WhatsApp', 'Tipo de plano', 'Vidas', 'Cidade', 'UF', 'Status', 'Anotações'];
    const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [headers, ...leads.map((lead) => [new Date(lead.created_at).toLocaleString('pt-BR'), lead.source === 'whatsapp' ? 'Clique direto no WhatsApp' : 'Formulário de cotação', lead.source_detail, lead.name, lead.email, lead.phone, lead.plan, lead.lives, lead.city, lead.state, lead.status, lead.notes])];
    const csv = '\uFEFF' + lines.map((line) => line.map(quote).join(';')).join('\r\n');
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.href = objectUrl;
    link.download = `leads-amil-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  // Login e carregamento inicial.
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginMessage.textContent = '';
    const button = loginForm.querySelector('button');
    button.disabled = true;
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: new FormData(loginForm).get('password') }),
      });
      if (!response.ok) throw new Error('Confira a senha ou a configuração do CRM.');
      loginForm.reset();
      await loadLeads();
    } catch (error) { loginMessage.textContent = error.message; }
    finally { button.disabled = false; }
  });

  // Navegação superior e inferior.
  document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => setTab(button.dataset.tab)));
  document.querySelectorAll('[data-go-leads]').forEach((button) => button.addEventListener('click', () => {
    statusFilter = 'Novo';
    document.querySelectorAll('[data-status-filter]').forEach((chip) => chip.classList.toggle('is-selected', chip.dataset.statusFilter === 'Novo'));
    renderLeads();
    setTab('leads');
  }));
  document.querySelector('#exportCsv').addEventListener('click', exportCsv);
  document.querySelector('#mobileExport').addEventListener('click', exportCsv);

  // Pesquisa e filtros da lista.
  search.addEventListener('input', renderLeads);
  document.querySelectorAll('[data-status-filter]').forEach((chip) => chip.addEventListener('click', () => {
    statusFilter = chip.dataset.statusFilter;
    document.querySelectorAll('[data-status-filter]').forEach((item) => item.classList.toggle('is-selected', item === chip));
    renderLeads();
  }));

  // Salva uma etapa e as anotações de um lead.
  leadList.addEventListener('click', async (event) => {
    const button = event.target.closest('.save-lead');
    if (!button) return;
    const card = button.closest('.lead-card');
    const lead = leads.find((item) => item.id === card.dataset.id);
    if (!lead) return;
    button.disabled = true;
    dashboardMessage.textContent = '';
    try {
      const response = await fetch('/api/crm-leads', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, status: card.querySelector('.status-select').value, notes: card.querySelector('.notes-input').value }),
      });
      if (!response.ok) throw new Error('Não consegui salvar as alterações. Tente novamente.');
      lead.status = card.querySelector('.status-select').value;
      lead.notes = card.querySelector('.notes-input').value;
      dashboardMessage.className = 'crm-message dashboard-message is-success';
      dashboardMessage.textContent = 'Alterações salvas.';
      renderDashboard();
    } catch (error) {
      dashboardMessage.className = 'crm-message dashboard-message is-error';
      dashboardMessage.textContent = error.message;
    } finally { button.disabled = false; }
  });

  // Exclui permanentemente somente após confirmação com o nome do contato.
  leadList.addEventListener('click', async (event) => {
    const button = event.target.closest('.delete-lead');
    if (!button) return;
    const card = button.closest('.lead-card');
    const lead = leads.find((item) => item.id === card.dataset.id);
    if (!lead || !window.confirm(`Excluir permanentemente o lead de ${lead.name}? Essa ação não pode ser desfeita.`)) return;

    button.disabled = true;
    button.textContent = 'Excluindo...';
    dashboardMessage.className = 'crm-message dashboard-message';
    dashboardMessage.textContent = '';
    try {
      const response = await fetch('/api/crm-leads', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id }),
      });
      if (!response.ok) throw new Error('Não consegui excluir esse lead. Tente novamente.');
      leads = leads.filter((item) => item.id !== lead.id);
      dashboardMessage.className = 'crm-message dashboard-message is-success';
      dashboardMessage.textContent = 'Lead excluído.';
      renderDashboard();
    } catch (error) {
      dashboardMessage.className = 'crm-message dashboard-message is-error';
      dashboardMessage.textContent = error.message;
      button.disabled = false;
      button.textContent = 'Excluir';
    }
  });

  // Encerra a sessão protegida e retorna à tela de acesso.
  document.querySelector('#logout').addEventListener('click', async () => {
    await fetch('/api/admin-login', { method: 'DELETE' });
    showLogin();
  });

  loadLeads().catch((error) => { showLogin(); loginMessage.textContent = error.message; });
})();
