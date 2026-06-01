/*
gerador de logs semiestruturados
simula a geracao de logs de auditoria e seguranca e grava em arquivo json
*/

const fs = require('fs');
const path = require('path');

// dados ficticios de usuarios para os logs
const users = [
  { id: 'e3b0c442-98fc-11ee-b9d1-0242ac120002', name: 'João Silva', email: 'joao@email.com' },
  { id: 'f4b1d553-99fd-11ee-b9d1-0242ac120003', name: 'Matheus Teste', email: 'matheus@email.com' }
];

// lista de acoes possiveis para simular eventos
const actions = [
  { action: 'auth.login.success', category: 'SECURITY' },
  { action: 'auth.login.failed', category: 'SECURITY' },
  { action: 'ride.request', category: 'TRANSACTION' },
  { action: 'payment.card.added', category: 'BILLING' },
  { action: 'place.saved', category: 'USER_SETTINGS' }
];

// funcao que gera um log aleatorio no formato semiestruturado
function generateMockLog() {
  const user = users[Math.floor(Math.random() * users.length)];
  const act = actions[Math.floor(Math.random() * actions.length)];
  const timestamp = new Date().toISOString();
  
  // monta o payload dinamico conforme a acao executada
  let payload = {};
  if (act.action.startsWith('auth.login')) {
    payload = {
      email: user.email,
      device: Math.random() > 0.5 ? 'Android 13 (Samsung S23)' : 'Android 14 (Motorola Edge)',
      app_version: '1.0.0',
      success: act.action === 'auth.login.success'
    };
  } else if (act.action === 'ride.request') {
    payload = {
      destination: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      estimated_price: 'R$ 24,50',
      category: 'comfort',
      coordinates: { lat: -23.5615, lng: -46.6559 }
    };
  } else if (act.action === 'payment.card.added') {
    payload = {
      card_brand: 'visa',
      card_number_masked: '•••• •••• •••• 4242',
      card_holder: user.name.toUpperCase()
    };
  } else if (act.action === 'place.saved') {
    payload = {
      place_type: 'work',
      place_title: 'Trabalho',
      place_address: 'Shopping Eldorado - Pinheiros, São Paulo - SP'
    };
  }

  const logEntry = {
    timestamp: timestamp,
    level: act.action.includes('failed') ? 'WARN' : 'INFO',
    category: act.category,
    action: act.action,
    user_id: user.id,
    user_email: user.email,
    payload: payload, // formato semiestruturado json
    session_id: 'sess_' + Math.random().toString(36).substring(2, 15)
  };

  return logEntry;
}

// cria array com 10 logs mockados
const logsList = [];
for (let i = 0; i < 10; i++) {
  logsList.push(generateMockLog());
}

// salva array de logs no arquivo json local
const logsFilePath = path.join(__dirname, 'mock_audit_logs.json');
fs.writeFileSync(logsFilePath, JSON.stringify(logsList, null, 2), 'utf-8');

console.log('========================================================================');
console.log('gerador de logs executado com sucesso');
console.log(`arquivo de logs gerado em ${logsFilePath}`);
console.log('========================================================================');
console.log('exemplo de log gerado');
console.log(JSON.stringify(logsList[0], null, 2));
console.log('========================================================================');
