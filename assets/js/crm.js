// Interface do painel privado: login, listagem, atualização e exportação dos leads.
(() => {
  const loginPanel = document.querySelector('#loginPanel');
  const dashboard = document.querySelector('#dashboard');
  const crmActions = document.querySelector('#crmActions');
  const loginForm = document.querySelector('#loginForm');
  const loginMessage = document.querySelector('#loginMessage');
  const dashboardMessage = document.querySelector('#dashboardMessage');
  const rows = document.querySelector('#leadRows');
  const emptyState = document.querySelector('#emptyState');
  const search = document.querySelector('#searchLeads');
  const statuses = ['Novo', 'Em contato', 'Cotação enviada', 'Fechado', 'Perdido'];
  let leads = [];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  async function loadLeads() {
    const response = await fetch('/api/crm-leads', { cache: 'no-store' });
    if (response.status === 401) return showLogin();
    if (!response.ok) throw new Error('Não consegui carregar os leads.');
    const data = await response.json();
    leads = data.leads || [];
    showDashboard();
    renderLeads();
    document.querySelector('#lastUpdated').textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function showLogin() {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    crmActions.hidden = true;
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    crmActions.hidden = false;
  }

  function renderLeads() {
    const query = search.value.trim().toLocaleLowerCase('pt-BR');
    const visible = leads.filter((lead) => [lead.name, lead.email, lead.phone, lead.plan, lead.city, lead.state].join(' ').toLocaleLowerCase('pt-BR').includes(query));
    document.querySelector('#leadCount').textContent = String(leads.length);
    emptyState.hidden = visible.length > 0;
    rows.innerHTML = visible.map((lead) => {
      const options = statuses.map((status) => `<option value="${status}" ${lead.status === status ? 'selected' : ''}>${status}</option>`).join('');
      const date = new Date(lead.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      return `<tr data-id="${escapeHtml(lead.id)}">
        <td><span class="lead-name">${escapeHtml(lead.name)}</span><span class="lead-sub">${escapeHtml(lead.email)}</span><span class="lead-sub">${escapeHtml(lead.phone)}</span></td>
        <td>${escapeHtml(lead.plan)}<span class="lead-sub">${escapeHtml(lead.lives)} vida(s)</span></td>
        <td>${escapeHtml(lead.city)} - ${escapeHtml(lead.state)}</td>
        <td>${escapeHtml(date)}</td>
        <td><select class="status-select" aria-label="Status do lead">${options}</select></td>
        <td><textarea class="notes-input" aria-label="Anotações">${escapeHtml(lead.notes || '')}</textarea></td>
        <td><button class="save-lead" type="button">Salvar</button></td>
      </tr>`;
    }).join('');
  }

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

  rows.addEventListener('click', async (event) => {
    const button = event.target.closest('.save-lead');
    if (!button) return;
    const row = button.closest('tr');
    button.disabled = true;
    dashboardMessage.textContent = '';
    try {
      const response = await fetch('/api/crm-leads', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.dataset.id, status: row.querySelector('.status-select').value, notes: row.querySelector('.notes-input').value }),
      });
      if (!response.ok) throw new Error('Não consegui salvar as alterações.');
      const lead = leads.find((item) => item.id === row.dataset.id);
      if (lead) { lead.status = row.querySelector('.status-select').value; lead.notes = row.querySelector('.notes-input').value; }
      dashboardMessage.style.color = '#13734f';
      dashboardMessage.textContent = 'Lead atualizado.';
    } catch (error) { dashboardMessage.style.color = '#a33'; dashboardMessage.textContent = error.message; }
    finally { button.disabled = false; }
  });

  search.addEventListener('input', renderLeads);

  document.querySelector('#exportCsv').addEventListener('click', () => {
    const headers = ['Recebido em', 'Nome', 'E-mail', 'WhatsApp', 'Tipo de plano', 'Vidas', 'Cidade', 'UF', 'Status', 'Anotações'];
    const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [headers, ...leads.map((lead) => [new Date(lead.created_at).toLocaleString('pt-BR'), lead.name, lead.email, lead.phone, lead.plan, lead.lives, lead.city, lead.state, lead.status, lead.notes])];
    const csv = '\uFEFF' + lines.map((line) => line.map(quote).join(';')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `leads-amil-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  document.querySelector('#logout').addEventListener('click', async () => {
    await fetch('/api/admin-login', { method: 'DELETE' });
    showLogin();
  });

  loadLeads().catch((error) => { showLogin(); loginMessage.textContent = error.message; });
})();
