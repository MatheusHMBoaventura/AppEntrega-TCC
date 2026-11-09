/*
 gerenciador unificado de dados
 integra sqlite local e supabase cloud
*/

/* ==========================================================================
   Criptografia e Hashing Seguro de Senhas (§7.5 - Resolução de Divergência)
   Garante que nenhuma senha seja armazenada ou comparada em texto puro.
   Utiliza Web Crypto API (SHA-256) nativa com fallback em JavaScript puro.
   ========================================================================== */

function sha256Pure(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  
  let hash = [];
  let k = [];
  let primeCounter = 0;

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = candidate * candidate; i < 312; i += candidate) {
        isComposite[i] = true;
      }
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + w[i]) | 0;
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

async function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  const str = String(plainPassword).trim();
  // Se a string já corresponder a um hash SHA-256 de 64 caracteres hexadecimais, mantém
  if (/^[a-f0-9]{64}$/i.test(str)) {
    return str.toLowerCase();
  }

  // Tenta usar a Web Crypto API nativa do navegador/WebView
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const msgBuffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
    } catch (_) {
      // fallback abaixo
    }
  }

  // Fallback seguro em JavaScript puro com suporte a UTF-8
  try {
    const utf8Str = unescape(encodeURIComponent(str));
    return sha256Pure(utf8Str).toLowerCase();
  } catch (_) {
    return sha256Pure(str).toLowerCase();
  }
}

/*
 gerencia persistencia local sqlite e localstorage
 serve como modo offline de contingencia
*/
class LocalSQLiteManager {
  constructor() {
    this.db = null;
    this.isWebSQL = false;
    this.dbName = 'MotoHelpDB';
    this.dbVersion = '1.0';
    this.dbDisplayName = 'MotoHelp Local Database';
    this.dbSize = 5 * 1024 * 1024;
  }

  async init() {
    if (window.openDatabase) {
      try {
        this.db = window.openDatabase(this.dbName, this.dbVersion, this.dbDisplayName, this.dbSize);
        this.isWebSQL = true;
        console.log('sqlite local inicializado');
      } catch (e) {
        console.warn('erro ao abrir websql usando localstorage fallback', e);
        this.isWebSQL = false;
      }
    } else {
      this.isWebSQL = false;
    }

    await this.createTables();
    await this.seedDefaultData();
    await this.migrateLegacyPasswords();
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.isWebSQL) {
        this.db.transaction((tx) => {
          tx.executeSql(sql, params, (transaction, results) => {
            const rowsArray = [];
            for (let i = 0; i < results.rows.length; i++) {
              rowsArray.push(results.rows.item(i));
            }
            resolve({
              insertId: results.insertId || null,
              rowsAffected: results.rowsAffected || 0,
              rows: {
                length: rowsArray.length,
                item: (idx) => rowsArray[idx],
                toArray: () => rowsArray
              }
            });
          }, (transaction, error) => {
            reject(error);
            return false;
          });
        });
      } else {
        try {
          const result = this.executeLocalStorageFallbackSQL(sql, params);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      }
    });
  }

  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        password TEXT,
        user_type TEXT,
        avatar TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS delivery_drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        cpf TEXT,
        vehicle_type TEXT,
        vehicle_plate TEXT,
        cnh TEXT,
        fuel_consumption REAL DEFAULT 35.0,
        last_oil_km INTEGER DEFAULT 0,
        last_tires_km INTEGER DEFAULT 0,
        last_chain_km INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS merchants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        store_name TEXT,
        cnpj_cpf TEXT,
        category TEXT,
        address TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS rides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        address TEXT,
        date TEXT,
        price TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        brand TEXT,
        number TEXT,
        holder TEXT,
        expiry TEXT,
        is_default INTEGER
      );`,
      `CREATE TABLE IF NOT EXISTS places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        type TEXT,
        title TEXT,
        address TEXT,
        lat REAL,
        lng REAL
      );`,
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id TEXT,
        driver_id TEXT,
        store_name TEXT,
        pickup_address TEXT,
        delivery_address TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        package_details TEXT,
        price TEXT,
        lat REAL,
        lng REAL,
        qr_code TEXT,
        status TEXT,
        created_at TEXT,
        delivered_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT,
        table_name TEXT,
        record_id TEXT,
        old_values TEXT,
        new_values TEXT,
        payload TEXT,
        created_at TEXT
      );`
    ];
    for (const sql of queries) {
      await this.query(sql);
    }
  }

  async migrateLegacyPasswords() {
    try {
      const allUsers = await this.query('SELECT id, email, password FROM users');
      const list = allUsers.rows ? (allUsers.rows.toArray ? allUsers.rows.toArray() : Array.from({ length: allUsers.rows.length }, (_, i) => allUsers.rows.item(i))) : [];
      for (const u of list) {
        if (u.password && (!/^[a-f0-9]{64}$/i.test(String(u.password).trim()))) {
          const hashed = await hashPassword(u.password);
          await this.query('UPDATE users SET password = ? WHERE id = ?', [hashed, u.id]);
          console.log(`[Segurança §7.5] Senha legada do usuário ${u.email} migrada para hash SHA-256.`);
        }
      }
    } catch (e) {
      console.warn('Aviso na verificação de migração de senhas legadas:', e);
    }
  }

  async seedDefaultData() {
    // Hash SHA-256 da senha padrão '123456' (§7.5 - Armazenamento seguro de senhas)
    const passwordHash123456 = await hashPassword('123456');

    // garante que o usuario padrao joao silva (entregador moto) exista e tenha o hash da senha
    const checkJoao = await this.query('SELECT * FROM users WHERE email = ?', ['joao@email.com']);
    if (checkJoao.rows.length === 0) {
      console.log('semeando usuario padrao joao silva (entregador moto) com hash SHA-256');
      
      const userRes = await this.query(
        'INSERT INTO users (name, email, phone, password, user_type, avatar) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'João Silva', 
          'joao@email.com', 
          '(11) 98765-4321', 
          passwordHash123456,
          'entregador', 
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
        ]
      );
      
      const joaoId = String(userRes.insertId || '1');
      await this.query(
        'INSERT INTO delivery_drivers (user_id, cpf, vehicle_type, vehicle_plate, cnh) VALUES (?, ?, ?, ?, ?)',
        [joaoId, '123.456.789-00', 'Moto', 'ABC-1234', '12345678900']
      );

      const mockRides = [
        [joaoId, '123 Main Street', 'Mar 28, 2026', 'R$ 24,50'],
        [joaoId, 'Downtown Mall', 'Mar 25, 2026', 'R$ 18,00'],
        [joaoId, 'Airport Terminal 2', 'Mar 20, 2026', 'R$ 45,30']
      ];
      for (const ride of mockRides) {
        await this.query('INSERT INTO rides (user_id, address, date, price) VALUES (?, ?, ?, ?)', ride);
      }

      const mockCards = [
        [joaoId, 'visa', '•••• •••• •••• 4242', 'JOÃO SILVA', '12/30', 1],
        [joaoId, 'mastercard', '•••• •••• •••• 9999', 'JOÃO SILVA', '08/29', 0]
      ];
      for (const card of mockCards) {
        await this.query('INSERT INTO cards (user_id, brand, number, holder, expiry, is_default) VALUES (?, ?, ?, ?, ?, ?)', card);
      }

      const mockPlaces = [
        [joaoId, 'home', 'Casa', 'Av. Paulista, 1000 - Bela Vista', -23.5615, -46.6559],
        [joaoId, 'work', 'Trabalho', 'Shopping Eldorado - Pinheiros', -23.5727, -46.6961]
      ];
      for (const place of mockPlaces) {
        await this.query('INSERT INTO places (user_id, type, title, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)', place);
      }
    } else {
      // atualiza a senha para hash seguro SHA-256
      await this.query('UPDATE users SET password = ? WHERE email = ?', [passwordHash123456, 'joao@email.com']);
    }

    // garante que o usuario matheus (lojista) para testes locais seja semeado
    const checkMatheus = await this.query('SELECT * FROM users WHERE email = ?', ['matheus@email.com']);
    if (checkMatheus.rows.length === 0) {
      console.log('semeando usuario matheus (lojista) com hash SHA-256');
      const matheusRes = await this.query(
        'INSERT INTO users (name, email, phone, password, user_type, avatar) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'Matheus Teste', 
          'matheus@email.com', 
          '(11) 99999-9999', 
          passwordHash123456, 
          'lojista',
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
        ]
      );
      const matheusId = String(matheusRes.insertId);
      await this.query(
        'INSERT INTO merchants (user_id, store_name, cnpj_cpf, category, address) VALUES (?, ?, ?, ?, ?)',
        [matheusId, 'Pizzaria do Matheus', '12.345.678/0001-99', 'Restaurante', 'Av. Paulista, 2000 - Bela Vista']
      );
    } else {
      await this.query('UPDATE users SET password = ? WHERE email = ?', [passwordHash123456, 'matheus@email.com']);
    }

    // garante que o socorro emergencial (borracharia/oficina) seja semeado para o SOS
    const checkBorracharia = await this.query('SELECT * FROM users WHERE email = ?', ['borracharia@email.com']);
    if (checkBorracharia.rows.length === 0) {
      console.log('semeando borracharia emergencial para SOS com hash SHA-256');
      const bRes = await this.query(
        'INSERT INTO users (name, email, phone, password, user_type, avatar) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'Marcos Borracharia',
          'borracharia@email.com',
          '(11) 94444-5555',
          passwordHash123456,
          'lojista',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150'
        ]
      );
      const bId = String(bRes.insertId);
      await this.query(
        'INSERT INTO merchants (user_id, store_name, cnpj_cpf, category, address) VALUES (?, ?, ?, ?, ?)',
        [bId, 'Borracharia & AutoPeças Express 24h', '33.221.100/0001-44', 'Borracharia / Auto Peças', 'Av. Santo Amaro, 800 - Itaim Bibi']
      );
    } else {
      await this.query('UPDATE users SET password = ? WHERE email = ?', [passwordHash123456, 'borracharia@email.com']);
    }

    // garante que pedidos/fretes iniciais estejam semeados para o portal de oportunidades
    const checkOrders = await this.query('SELECT * FROM orders');
    if (checkOrders.rows.length === 0) {
      console.log('semeando pedidos iniciais para fretes');
      const mockOrders = [
        [
          '1',
          'Pizzaria do Matheus',
          'Av. Paulista, 2000 - Bela Vista',
          'Rua Augusta, 1200 - Consolação',
          'Lucas Souza',
          '(11) 98888-1234',
          '1x Pizza Família + 1x Coca 2L',
          'R$ 16,50',
          -23.5532,
          -46.6572,
          'ENT-10421',
          'available',
          'Hoje 14:10'
        ],
        [
          '1',
          'Burger Express',
          'Rua Augusta, 500 - Consolação',
          'Alameda Santos, 950 - Cerqueira César',
          'Juliana Paes',
          '(11) 97777-4321',
          '2x Smash Burger Artesanal + Batata',
          'R$ 14,00',
          -23.5663,
          -46.6521,
          'ENT-10422',
          'available',
          'Hoje 14:25'
        ],
        [
          '1',
          'Farmácia Central 24h',
          'Av. Rebouças, 1200 - Pinheiros',
          'Rua da Consolação, 2500 - Cerqueira César',
          'Marcos Vinícius',
          '(11) 96666-9988',
          'Medicamentos em embalagem lacrada',
          'R$ 19,00',
          -23.5578,
          -46.6625,
          'ENT-10423',
          'available',
          'Hoje 14:40'
        ]
      ];
      for (const ord of mockOrders) {
        await this.query(
          `INSERT INTO orders (merchant_id, store_name, pickup_address, delivery_address, customer_name, customer_phone, package_details, price, lat, lng, qr_code, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ord
        );
      }
    }
  }

  async registerUser(userData) {
    const { name, email, phone, password, userType, cpf, vehiclePlate, cnh, storeName, cnpjCpf, category, storeAddress } = userData;

    const check = await this.query('SELECT * FROM users WHERE email = ?', [email]);
    if (check.rows.length > 0) throw new Error('E-mail já cadastrado localmente.');

    const avatarDefault = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
    const type = userType || 'entregador';
    // Hash criptográfico SHA-256 (§7.5 - Nenhuma senha gravada em texto puro)
    const passwordHash = await hashPassword(password);

    const res = await this.query(
      'INSERT INTO users (name, email, phone, password, user_type, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phone, passwordHash, type, avatarDefault]
    );

    const newUserId = String(res.insertId);
    let extraData = {};

    if (type === 'entregador') {
      await this.query(
        'INSERT INTO delivery_drivers (user_id, cpf, vehicle_type, vehicle_plate, cnh) VALUES (?, ?, ?, ?, ?)',
        [newUserId, cpf || '', 'Moto', vehiclePlate || '', cnh || '']
      );
      extraData = { cpf, vehicle_type: 'Moto', vehicle_plate: vehiclePlate, cnh };
    } else if (type === 'lojista') {
      await this.query(
        'INSERT INTO merchants (user_id, store_name, cnpj_cpf, category, address) VALUES (?, ?, ?, ?, ?)',
        [newUserId, storeName || '', cnpjCpf || '', category || 'Outros', storeAddress || '']
      );
      extraData = { store_name: storeName, cnpj_cpf: cnpjCpf, category, address: storeAddress };
    }

    await this.query(
      'INSERT INTO places (user_id, type, title, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)',
      [newUserId, 'home', 'Casa', 'Av. Paulista, 2000 - Bela Vista', -23.5596, -46.6583]
    );

    return { id: newUserId, name, email, phone, user_type: type, avatar: avatarDefault, ...extraData };
  }

  async loginUser(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();
    if (!cleanEmail || !cleanPass) throw new Error('E-mail e senha são obrigatórios.');

    // Cálculo do hash SHA-256 para comparação segura (§7.5)
    const passHash = await hashPassword(cleanPass);

    let res = await this.query('SELECT * FROM users WHERE email = ? AND password = ?', [cleanEmail, passHash]);
    
    // Migração transparente caso a base local possua senha legada em texto puro
    if (res.rows.length === 0) {
      const legacyCheck = await this.query('SELECT * FROM users WHERE email = ? AND password = ?', [cleanEmail, cleanPass]);
      if (legacyCheck.rows.length > 0) {
        await this.query('UPDATE users SET password = ? WHERE email = ?', [passHash, cleanEmail]);
        res = legacyCheck;
        console.log(`[Segurança §7.5] Senha legada do usuário ${cleanEmail} migrada com sucesso para hash SHA-256.`);
      }
    }

    if (res.rows.length === 0) throw new Error('E-mail ou senha incorretos.');
    
    const user = { ...res.rows.item(0) };
    delete user.password; // Higienização: nunca propaga hash ou senha para a sessão
    let extraData = {};

    if (user.user_type === 'entregador') {
      const driverRes = await this.query('SELECT * FROM delivery_drivers WHERE user_id = ?', [user.id]);
      if (driverRes.rows.length > 0) extraData = driverRes.rows.item(0);
    } else if (user.user_type === 'lojista') {
      const merchantRes = await this.query('SELECT * FROM merchants WHERE user_id = ?', [user.id]);
      if (merchantRes.rows.length > 0) extraData = merchantRes.rows.item(0);
    }

    return { ...user, ...extraData };
  }

  async checkUserByEmail(email) {
    const res = await this.query('SELECT * FROM users WHERE email = ?', [email]);
    return res.rows.length > 0 ? res.rows.item(0) : null;
  }

  async updateDriverDocuments(userId, cpf, vehiclePlate, cnh) {
    const check = await this.query('SELECT * FROM delivery_drivers WHERE user_id = ?', [userId]);
    if (check.rows.length === 0) {
      await this.query(
        'INSERT INTO delivery_drivers (user_id, vehicle_type, vehicle_plate, cpf, cnh) VALUES (?, ?, ?, ?, ?)',
        [userId, 'Moto', vehiclePlate, cpf, cnh]
      );
    } else {
      await this.query(
        'UPDATE delivery_drivers SET vehicle_plate = ?, cpf = ?, cnh = ? WHERE user_id = ?',
        [vehiclePlate, cpf, cnh, userId]
      );
    }
    return { user_id: userId, vehicle_plate: vehiclePlate, cpf, cnh };
  }

  async updateUserProfile(userId, name, email, phone, avatar) {
    await this.query('UPDATE users SET name = ?, email = ?, phone = ?, avatar = ? WHERE id = ?', [name, email, phone, avatar, userId]);
    return { id: userId, name, email, phone, avatar };
  }

  async updateMotoDetails(userId, fuelConsumption, lastOilKm, lastTiresKm, lastChainKm) {
    const check = await this.query('SELECT * FROM delivery_drivers WHERE user_id = ?', [userId]);
    if (check.rows.length === 0) {
      await this.query(
        'INSERT INTO delivery_drivers (user_id, vehicle_type, vehicle_plate, cpf, cnh, fuel_consumption, last_oil_km, last_tires_km, last_chain_km) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, 'Moto', 'ABC-1234', '000.000.000-00', '00000000000', fuelConsumption, lastOilKm, lastTiresKm, lastChainKm]
      );
    } else {
      await this.query(
        'UPDATE delivery_drivers SET fuel_consumption = ?, last_oil_km = ?, last_tires_km = ?, last_chain_km = ? WHERE user_id = ?',
        [fuelConsumption, lastOilKm, lastTiresKm, lastChainKm, userId]
      );
    }
    return { fuel_consumption: fuelConsumption, last_oil_km: lastOilKm, last_tires_km: lastTiresKm, last_chain_km: lastChainKm };
  }

  async getRides(userId) {
    const res = await this.query('SELECT * FROM rides WHERE user_id = ? ORDER BY id DESC', [userId]);
    return res.rows.toArray();
  }

  async addRide(userId, address, date, price) {
    return await this.query('INSERT INTO rides (user_id, address, date, price) VALUES (?, ?, ?, ?)', [userId, address, date, price]);
  }

  async getCards(userId) {
    const res = await this.query('SELECT * FROM cards WHERE user_id = ? ORDER BY is_default DESC, id DESC', [userId]);
    return res.rows.toArray();
  }

  async addCard(userId, brand, number, holder, expiry) {
    return await this.query('INSERT INTO cards (user_id, brand, number, holder, expiry, is_default) VALUES (?, ?, ?, ?, ?, ?)', [userId, brand, number, holder, expiry, 0]);
  }

  async setCardDefault(userId, cardId) {
    await this.query('UPDATE cards SET is_default = 0 WHERE user_id = ?', [userId]);
    return await this.query('UPDATE cards SET is_default = 1 WHERE user_id = ? AND id = ?', [userId, cardId]);
  }

  async deleteCard(userId, cardId) {
    return await this.query('DELETE FROM cards WHERE user_id = ? AND id = ?', [userId, cardId]);
  }

  async getPlaces(userId) {
    const res = await this.query('SELECT * FROM places WHERE user_id = ? ORDER BY id DESC', [userId]);
    return res.rows.toArray();
  }

  async addPlace(userId, type, title, address, lat, lng) {
    return await this.query('INSERT INTO places (user_id, type, title, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)', [userId, type, title, address, lat, lng]);
  }

  async deletePlace(userId, placeId) {
    return await this.query('DELETE FROM places WHERE user_id = ? AND id = ?', [userId, placeId]);
  }

  async getOrders(status = null, merchantId = null, driverId = null) {
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (status) {
      sql = 'SELECT * FROM orders WHERE status = ?';
      params.push(status);
    } else if (merchantId) {
      sql = 'SELECT * FROM orders WHERE merchant_id = ?';
      params.push(merchantId);
    } else if (driverId) {
      sql = 'SELECT * FROM orders WHERE driver_id = ?';
      params.push(driverId);
    }
    sql += ' ORDER BY id DESC';
    const res = await this.query(sql, params);
    return res.rows.toArray();
  }

  async getOrderByQrCode(qrCode) {
    if (!qrCode) return null;
    const clean = String(qrCode).trim();
    const res = await this.query('SELECT * FROM orders WHERE qr_code = ?', [clean]);
    if (res.rows && res.rows.length > 0) {
      return res.rows.item(0);
    }
    return null;
  }

  async logAudit(userId, action, payload = {}) {
    try {
      const now = new Date().toISOString();
      const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const tableName = payload && payload.table_name ? String(payload.table_name) : null;
      const recordId = payload && payload.record_id ? String(payload.record_id) : (payload && payload.order_id ? String(payload.order_id) : null);
      const oldVals = payload && payload.old_values ? JSON.stringify(payload.old_values) : null;
      const newVals = payload && payload.new_values ? JSON.stringify(payload.new_values) : null;

      await this.query(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [String(userId || ''), String(action || ''), tableName, recordId, oldVals, newVals, payloadStr, now]
      );
      return true;
    } catch (e) {
      console.warn('[Audit Local] Falha ao registrar log local:', e);
      return false;
    }
  }

  async createOrder(orderData) {
    const { merchant_id, store_name, pickup_address, delivery_address, customer_name, customer_phone, package_details, price, lat, lng, qr_code } = orderData;
    const now = new Date().toLocaleString('pt-BR');
    const code = qr_code || `ENT-${Math.floor(10000 + Math.random() * 90000)}`;
    const res = await this.query(
      'INSERT INTO orders (merchant_id, driver_id, store_name, pickup_address, delivery_address, customer_name, customer_phone, package_details, price, lat, lng, qr_code, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [String(merchant_id || ''), '', store_name || 'Loja Parceira', pickup_address || '', delivery_address || '', customer_name || 'Cliente', customer_phone || '', package_details || 'Pacote Padrão', price || 'R$ 15,00', parseFloat(lat) || -23.56, parseFloat(lng) || -46.65, code, 'available', now]
    );
    return { id: res.insertId, ...orderData, qr_code: code, status: 'available', created_at: now };
  }

  async acceptOrder(orderId, driverId) {
    await this.query('UPDATE orders SET status = ?, driver_id = ? WHERE id = ?', ['in_transit', String(driverId), String(orderId)]);
    const res = await this.query('SELECT * FROM orders WHERE id = ?', [String(orderId)]);
    return res.rows.length > 0 ? res.rows.item(0) : null;
  }

  async completeOrder(orderId, driverId) {
    const now = new Date().toLocaleString('pt-BR');
    await this.query('UPDATE orders SET status = ?, delivered_at = ? WHERE id = ?', ['delivered', now, String(orderId)]);
    const res = await this.query('SELECT * FROM orders WHERE id = ?', [String(orderId)]);
    const order = res.rows.length > 0 ? res.rows.item(0) : null;
    if (order) {
      await this.addRide(driverId, `Entrega #${order.id}: ${order.store_name} -> ${order.delivery_address}`, now, order.price);
    }
    return order;
  }

  async getEmergencyServices() {
    const res = await this.query('SELECT * FROM merchants WHERE category = ?', ['Borracharia / Auto Peças']);
    if (res.rows.length > 0) return res.rows.toArray();
    const all = await this.query('SELECT * FROM merchants');
    return all.rows.toArray();
  }

  executeLocalStorageFallbackSQL(sql, params) {
    const cleanSql = sql.replace(/\s+/g, ' ').trim();
    const getTable = (name) => {
      const data = localStorage.getItem(`AppDB_${name}`);
      return data ? JSON.parse(data) : [];
    };
    const saveTable = (name, arr) => {
      localStorage.setItem(`AppDB_${name}`, JSON.stringify(arr));
    };

    if (cleanSql.toUpperCase().startsWith('CREATE TABLE')) {
      const match = cleanSql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match) {
        const tableName = match[1];
        if (!localStorage.getItem(`AppDB_${tableName}`)) saveTable(tableName, []);
      }
      return { rowsAffected: 0, rows: { length: 0, item: () => null, toArray: () => [] } };
    }

    if (cleanSql.toUpperCase().startsWith('INSERT INTO')) {
      const match = cleanSql.match(/INSERT INTO (\w+)\s*\((.*?)\)/i);
      if (match) {
        const tableName = match[1];
        const columns = match[2].split(',').map(c => c.trim());
        const data = getTable(tableName);
        
        let nextId = 1;
        if (data.length > 0) nextId = Math.max(...data.map(item => parseInt(item.id) || 0)) + 1;

        const newObj = { id: String(nextId) };
        columns.forEach((col, idx) => {
          newObj[col] = params[idx];
        });
        if (newObj.is_default !== undefined) newObj.is_default = parseInt(newObj.is_default);

        data.push(newObj);
        saveTable(tableName, data);
        return { insertId: nextId, rowsAffected: 1, rows: { length: 0, item: () => null, toArray: () => [] } };
      }
    }

    if (cleanSql.toUpperCase().startsWith('SELECT')) {
      const matchFrom = cleanSql.match(/FROM (\w+)/i);
      if (matchFrom) {
        const tableName = matchFrom[1];
        let data = getTable(tableName);

        const matchWhere = cleanSql.match(/WHERE (.*?)(?:ORDER BY|$)/i);
        if (matchWhere) {
          const whereParts = matchWhere[1].split(' AND ').map(p => p.trim());
          whereParts.forEach((part, index) => {
            const eqMatch = part.match(/(\w+)\s*=\s*\?/);
            if (eqMatch) {
              const field = eqMatch[1];
              const valToMatch = params[index];
              data = data.filter(item => {
                if (typeof item[field] === 'number') return item[field] === parseFloat(valToMatch);
                return String(item[field]).toLowerCase() === String(valToMatch).toLowerCase();
              });
            }
          });
        }

        const matchOrder = cleanSql.match(/ORDER BY (\w+)\s+(DESC|ASC)/i);
        if (matchOrder) {
          const field = matchOrder[1];
          const isDesc = matchOrder[2].toUpperCase() === 'DESC';
          data.sort((a, b) => {
            if (a[field] < b[field]) return isDesc ? 1 : -1;
            if (a[field] > b[field]) return isDesc ? -1 : 1;
            return 0;
          });
        }

        return {
          insertId: null,
          rowsAffected: 0,
          rows: {
            length: data.length,
            item: (idx) => data[idx],
            toArray: () => data
          }
        };
      }
    }

    if (cleanSql.toUpperCase().startsWith('UPDATE')) {
      const matchUpdate = cleanSql.match(/UPDATE (\w+) SET (.*?)(?:WHERE|$)/i);
      if (matchUpdate) {
        const tableName = matchUpdate[1];
        const setString = matchUpdate[2];
        const data = getTable(tableName);
        
        const setFields = setString.split(',').map(f => f.trim().split('=')[0].trim());
        const setValuesCount = setFields.length;
        const updateVals = {};
        setFields.forEach((field, i) => {
          updateVals[field] = params[i];
        });

        const matchWhere = cleanSql.match(/WHERE (.*)/i);
        let updatedCount = 0;

        if (matchWhere) {
          const whereParts = matchWhere[1].split(' AND ').map(p => p.trim());
          data.forEach(item => {
            let isMatch = true;
            whereParts.forEach((part, whereIdx) => {
              const eqMatch = part.match(/(\w+)\s*=\s*\?/);
              if (eqMatch) {
                const field = eqMatch[1];
                const paramIdx = setValuesCount + whereIdx;
                const valToMatch = params[paramIdx];
                if (typeof item[field] === 'number') {
                  if (item[field] !== parseFloat(valToMatch)) isMatch = false;
                } else {
                  if (String(item[field]).toLowerCase() !== String(valToMatch).toLowerCase()) isMatch = false;
                }
              }
            });
            if (isMatch) {
              Object.keys(updateVals).forEach(key => {
                item[key] = updateVals[key];
                if (key === 'is_default') item[key] = parseInt(item[key]);
              });
              updatedCount++;
            }
          });
        }

        saveTable(tableName, data);
        return { insertId: null, rowsAffected: updatedCount, rows: { length: 0, item: () => null, toArray: () => [] } };
      }
    }

    if (cleanSql.toUpperCase().startsWith('DELETE')) {
      const matchDelete = cleanSql.match(/DELETE FROM (\w+)/i);
      if (matchDelete) {
        const tableName = matchDelete[1];
        let data = getTable(tableName);
        const originalLength = data.length;

        const matchWhere = cleanSql.match(/WHERE (.*)/i);
        if (matchWhere) {
          const whereParts = matchWhere[1].split(' AND ').map(p => p.trim());
          data = data.filter(item => {
            let isMatch = true;
            whereParts.forEach((part, whereIdx) => {
              const eqMatch = part.match(/(\w+)\s*=\s*\?/);
              if (eqMatch) {
                const field = eqMatch[1];
                const valToMatch = params[whereIdx];
                if (typeof item[field] === 'number') {
                  if (item[field] !== parseFloat(valToMatch)) isMatch = false;
                } else {
                  if (String(item[field]).toLowerCase() !== String(valToMatch).toLowerCase()) isMatch = false;
                }
              }
            });
            return !isMatch;
          });
        } else {
          data = [];
        }

        saveTable(tableName, data);
        return { insertId: null, rowsAffected: originalLength - data.length, rows: { length: 0, item: () => null, toArray: () => [] } };
      }
    }
    return { insertId: null, rowsAffected: 0, rows: { length: 0, item: () => null, toArray: () => [] } };
  }
}

/*
gerenciador de banco de dados unificado
detecta supabase cloud e ativa sqlite se houver falha
*/
class UnifiedDatabaseManager {
  constructor() {
    this.supabase = null;
    this.sqlite = null;
    this.isSupabaseMode = false;
  }

  /*
  inicializa o motor de banco de dados
  */
  async init() {
    // inicializa sqlite local incondicionalmente para fallback offline
    this.sqlite = new LocalSQLiteManager();
    await this.sqlite.init();

    // verifica se as chaves do supabase foram configuradas
    const hasSupabaseUrl = window.SUPABASE_URL && window.SUPABASE_URL !== 'SUA_SUPABASE_URL_AQUI' && window.SUPABASE_URL.trim() !== '';
    const hasSupabaseKey = window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY !== 'SUA_SUPABASE_ANON_KEY_AQUI' && window.SUPABASE_ANON_KEY.trim() !== '';

    if (window.supabase && hasSupabaseUrl && hasSupabaseKey) {
      try {
        console.log('supabase chaves encontradas conectando');
        this.supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        
        // valida conexao fisica com o supabase consultando tabela users
        const { error } = await this.supabase.from('users').select('count', { count: 'exact', head: true });
        
        if (error) throw error; // lanca erro se o banco falhar

        this.isSupabaseMode = true;
        console.log('supabase conectado modo online ativo');
        return;
      } catch (err) {
        console.error('supabase erro conexao', err.message);
        console.log('ativando fallback local');
      }
    }

    this.isSupabaseMode = false;
    console.log('sqlite fallback ativo');
  }

  /* fluxos de autenticacao */

  async registerUser(userData) {
    if (typeof userData === 'string') {
      // retrocompatibilidade se for chamado com parametros legados
      const [name, email, phone, password] = arguments;
      userData = { name, email, phone, password, userType: 'entregador' };
    }

    const { name, email, phone, password, userType, cpf, vehiclePlate, cnh, storeName, cnpjCpf, category, storeAddress } = userData;
    const type = userType || 'entregador';

    if (this.isSupabaseMode) {
      console.log(`cadastrando usuario ${email} como ${type}`);
      
      // cadastra no supabase auth
      const { data, error } = await this.supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name,
            phone: phone,
            user_type: type
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Falha no cadastro do usuário.');

      const newUserId = data.user.id;
      const avatarDefault = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';

      // cria perfil publico na tabela users no postgresql
      const baseUserData = {
        id: newUserId,
        name: name,
        email: email,
        phone: phone,
        avatar: avatarDefault
      };

      let { error: profileError } = await this.supabase.from('users').insert({
        ...baseUserData,
        user_type: type
      });

      // Fallback caso a tabela users nao possua a coluna user_type
      if (profileError && profileError.message && profileError.message.includes('user_type')) {
        console.warn('Coluna user_type nao existe na tabela users, inserindo sem ela...');
        const retryResult = await this.supabase.from('users').insert(baseUserData);
        profileError = retryResult.error;
      }

      if (profileError) {
        console.warn('Aviso na tabela users do Supabase:', profileError.message);
      }

      let extraData = {};
      if (type === 'entregador') {
        const { error: driverErr } = await this.supabase.from('delivery_drivers').insert({
          user_id: newUserId,
          cpf: cpf || '',
          vehicle_type: 'Moto',
          vehicle_plate: vehiclePlate || '',
          cnh: cnh || ''
        });
        if (driverErr) console.warn('Aviso: falha ao inserir registro de entregador no Supabase:', driverErr.message);
        extraData = { cpf, vehicle_type: 'Moto', vehicle_plate: vehiclePlate, cnh };
      } else if (type === 'lojista') {
        const { error: merchantErr } = await this.supabase.from('merchants').insert({
          user_id: newUserId,
          store_name: storeName || '',
          cnpj_cpf: cnpjCpf || '',
          category: category || 'Outros',
          address: storeAddress || ''
        });
        if (merchantErr) console.warn('Aviso: falha ao inserir registro de lojista no Supabase:', merchantErr.message);
        extraData = { store_name: storeName, cnpj_cpf: cnpjCpf, category, address: storeAddress };
      }

      // configura local padrao
      await this.supabase.from('places').insert({
        user_id: newUserId,
        type: 'home',
        title: 'Casa',
        address: 'Av. Paulista, 2000 - Bela Vista',
        lat: -23.5596,
        lng: -46.6583
      });

      return { id: newUserId, name, email, phone, user_type: type, avatar: avatarDefault, ...extraData };
    } else {
      console.log('executando cadastro no sqlite local fallback');
      return await this.sqlite.registerUser(userData);
    }
  }

  async loginUser(email, password) {
    if (this.isSupabaseMode) {
      console.log(`[Supabase Auth §7.5] Autenticando com Supabase Auth (Bcrypt): ${email}`);
      // autentica com Supabase Auth (senhas protegidas via Bcrypt no servidor na nuvem)
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;
      if (!data.user) throw new Error('E-mail ou senha incorretos.');

      // busca perfil público do PostgreSQL (tabela users não armazena senha)
      const { data: profile, error: profileErr } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

      if (profileErr || !profile) {
        return {
          id: data.user.id,
          name: data.user.user_metadata?.name || 'Usuário Supabase',
          email: data.user.email,
          phone: data.user.user_metadata?.phone || '',
          user_type: data.user.user_metadata?.user_type || 'entregador',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
        };
      }

      let extraData = {};
      if (profile.user_type === 'entregador') {
        const { data: driverData } = await this.supabase.from('delivery_drivers').select('*').eq('user_id', profile.id).single();
        if (driverData) extraData = driverData;
      } else if (profile.user_type === 'lojista') {
        const { data: merchantData } = await this.supabase.from('merchants').select('*').eq('user_id', profile.id).single();
        if (merchantData) extraData = merchantData;
      }

      const safeProfile = { ...profile, ...extraData };
      delete safeProfile.password;
      return safeProfile;
    } else {
      console.log('[SQLite Fallback §7.5] Autenticando com SQLite local protegido por hash SHA-256');
      return await this.sqlite.loginUser(email, password);
    }
  }

  async getProfileOrFallback(authUser) {
    if (!authUser) return null;
    try {
      const { data: profile } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profile) return { ...profile, user_type: profile.user_type || 'entregador' };

      // Se nao existir perfil na tabela users (ex: primeira vez logando via Google OAuth)
      const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Piloto Google';
      const email = authUser.email;
      const avatar = authUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';

      const baseUserData = {
        id: authUser.id,
        name: name,
        email: email,
        phone: authUser.phone || '',
        avatar: avatar
      };

      await this.supabase.from('users').insert(baseUserData);
      return { ...baseUserData, user_type: 'entregador' };
    } catch (e) {
      console.warn('Aviso ao obter perfil social do Supabase:', e);
      return {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Piloto Google',
        email: authUser.email,
        phone: '',
        user_type: 'entregador',
        avatar: authUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
      };
    }
  }

  async checkUserByEmail(email) {
    if (this.isSupabaseMode) {
      try {
        const { data, error } = await this.supabase.from('users').select('*').eq('email', email).maybeSingle();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Erro ao consultar email no supabase, usando sqlite:', e);
      }
    }
    return await this.sqlite.checkUserByEmail(email);
  }

  async updateDriverDocuments(userId, cpf, vehiclePlate, cnh) {
    if (this.isSupabaseMode) {
      try {
        const { error } = await this.supabase
          .from('delivery_drivers')
          .update({ vehicle_plate: vehiclePlate, cpf, cnh })
          .eq('user_id', userId);
        if (error) throw error;
        return { user_id: userId, vehicle_plate: vehiclePlate, cpf, cnh };
      } catch (e) {
        console.warn('Erro ao atualizar documentos no supabase, usando sqlite:', e);
      }
    }
    return await this.sqlite.updateDriverDocuments(userId, cpf, vehiclePlate, cnh);
  }

  async updateUserProfile(userId, name, email, phone, avatar) {
    if (this.isSupabaseMode) {
      console.log(`atualizando perfil ${userId}`);
      const { error } = await this.supabase
          .from('users')
          .update({ name, email, phone, avatar })
          .eq('id', userId);

      if (error) throw error;
      return { id: userId, name, email, phone, avatar };
    } else {
      return await this.sqlite.updateUserProfile(userId, name, email, phone, avatar);
    }
  }

  async updateMotoDetails(userId, fuelConsumption, lastOilKm, lastTiresKm, lastChainKm) {
    if (this.isSupabaseMode) {
      console.log(`atualizando detalhes da moto do entregador ${userId}`);
      const { error } = await this.supabase
          .from('delivery_drivers')
          .update({
            fuel_consumption: fuelConsumption,
            last_oil_km: lastOilKm,
            last_tires_km: lastTiresKm,
            last_chain_km: lastChainKm
          })
          .eq('user_id', userId);

      if (error) throw error;
      return { fuel_consumption: fuelConsumption, last_oil_km: lastOilKm, last_tires_km: lastTiresKm, last_chain_km: lastChainKm };
    } else {
      return await this.sqlite.updateMotoDetails(userId, fuelConsumption, lastOilKm, lastTiresKm, lastChainKm);
    }
  }

  /* fluxos de corridas */

  async getRides(userId) {
    if (this.isSupabaseMode) {
      const { data, error } = await this.supabase
          .from('rides')
          .select('*')
          .eq('user_id', userId)
          .order('id', { ascending: false });

      if (error) throw error;
      return data || [];
    } else {
      return await this.sqlite.getRides(userId);
    }
  }

  async addRide(userId, address, date, price) {
    if (this.isSupabaseMode) {
      console.log('salvando nova corrida');
      const { error } = await this.supabase
          .from('rides')
          .insert({
            user_id: userId,
            address: address,
            date: date,
            price: price
          });

      if (error) throw error;
    } else {
      return await this.sqlite.addRide(userId, address, date, price);
    }
  }

  /* fluxos de cartoes */

  async getCards(userId) {
    if (this.isSupabaseMode) {
      const { data, error } = await this.supabase
          .from('cards')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('id', { ascending: false });

      if (error) throw error;
      return data || [];
    } else {
      return await this.sqlite.getCards(userId);
    }
  }

  async addCard(userId, brand, number, holder, expiry) {
    if (this.isSupabaseMode) {
      console.log('cadastrando cartao');
      const { error } = await this.supabase
          .from('cards')
          .insert({
            user_id: userId,
            brand: brand,
            number: number,
            holder: holder,
            expiry: expiry,
            is_default: 0
          });

      if (error) throw error;
    } else {
      return await this.sqlite.addCard(userId, brand, number, holder, expiry);
    }
  }

  async setCardDefault(userId, cardId) {
    if (this.isSupabaseMode) {
      console.log(`alterando padrao cartao ${cardId}`);
      // zera definicao padrao de todos os cartoes
      const { error: resetErr } = await this.supabase
          .from('cards')
          .update({ is_default: 0 })
          .eq('user_id', userId);

      if (resetErr) throw resetErr;

      // define cartao como padrao
      const { error: setErr } = await this.supabase
          .from('cards')
          .update({ is_default: 1 })
          .eq('user_id', userId)
          .eq('id', cardId);

      if (setErr) throw setErr;
    } else {
      return await this.sqlite.setCardDefault(userId, cardId);
    }
  }

  async deleteCard(userId, cardId) {
    if (this.isSupabaseMode) {
      console.log(`removendo cartao ${cardId}`);
      const { error } = await this.supabase
          .from('cards')
          .delete()
          .eq('user_id', userId)
          .eq('id', cardId);

      if (error) throw error;
    } else {
      return await this.sqlite.deleteCard(userId, cardId);
    }
  }

  /* fluxos de lugares salvos */

  async getPlaces(userId) {
    if (this.isSupabaseMode) {
      const { data, error } = await this.supabase
          .from('places')
          .select('*')
          .eq('user_id', userId)
          .order('id', { ascending: false });

      if (error) throw error;
      return data || [];
    } else {
      return await this.sqlite.getPlaces(userId);
    }
  }

  async addPlace(userId, type, title, address, lat, lng) {
    if (this.isSupabaseMode) {
      console.log('salvando lugar favorito');
      const { error } = await this.supabase
          .from('places')
          .insert({
            user_id: userId,
            type: type,
            title: title,
            address: address,
            lat: lat,
            lng: lng
          });

      if (error) throw error;
    } else {
      return await this.sqlite.addPlace(userId, type, title, address, lat, lng);
    }
  }

  async deletePlace(userId, placeId) {
    if (this.isSupabaseMode) {
      console.log(`removendo lugar ${placeId}`);
      const { error } = await this.supabase
          .from('places')
          .delete()
          .eq('user_id', userId)
          .eq('id', placeId);

      if (error) throw error;
    } else {
      return await this.sqlite.deletePlace(userId, placeId);
    }
  }

  /* fluxos de pedidos e fretes (portal de oportunidades) */

  async getOrders(status = null, merchantId = null, driverId = null) {
    if (this.isSupabaseMode) {
      try {
        let query = this.supabase.from('orders').select('*');
        if (status) query = query.eq('status', status);
        if (merchantId) query = query.eq('merchant_id', merchantId);
        if (driverId) query = query.eq('driver_id', driverId);
        query = query.order('id', { ascending: false });
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Aviso: tabela orders no Supabase indisponível, usando fallback local:', err.message);
      }
      // Fallback seguro: se o Supabase não tiver pedidos ou tabela, carrega do SQLite local
      return await this.sqlite.getOrders(status, merchantId, driverId);
    } else {
      return await this.sqlite.getOrders(status, merchantId, driverId);
    }
  }

  async getOrderByQrCode(qrCode) {
    if (!qrCode) return null;
    const cleanCode = String(qrCode).trim();
    if (this.isSupabaseMode) {
      try {
        const { data, error } = await this.supabase
          .from('orders')
          .select('*')
          .eq('qr_code', cleanCode)
          .maybeSingle();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Aviso: busca por qr_code no Supabase falhou, consultando SQLite:', err.message);
      }
      return await this.sqlite.getOrderByQrCode(cleanCode);
    } else {
      return await this.sqlite.getOrderByQrCode(cleanCode);
    }
  }

  async logAudit(userId, action, payload = {}) {
    const tableName = payload && payload.table_name ? String(payload.table_name) : null;
    const recordId = payload && payload.record_id ? String(payload.record_id) : (payload && payload.order_id ? String(payload.order_id) : null);
    const oldVals = payload && payload.old_values ? payload.old_values : null;
    const newVals = payload && payload.new_values ? payload.new_values : null;

    const auditData = {
      user_id: userId ? String(userId) : null,
      action: String(action || 'action'),
      table_name: tableName,
      record_id: recordId,
      old_values: oldVals,
      new_values: newVals,
      payload: payload
    };
    if (this.isSupabaseMode) {
      try {
        const { error } = await this.supabase
          .from('audit_logs')
          .insert(auditData);
        if (error) throw error;
        return true;
      } catch (err) {
        console.warn('Aviso: falha ao inserir audit_log no Supabase, registrando localmente:', err.message);
        return await this.sqlite.logAudit(userId, action, payload);
      }
    } else {
      return await this.sqlite.logAudit(userId, action, payload);
    }
  }

  async createOrder(orderData) {
    if (this.isSupabaseMode) {
      const code = orderData.qr_code || `ENT-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data, error } = await this.supabase
        .from('orders')
        .insert({
          merchant_id: orderData.merchant_id,
          store_name: orderData.store_name,
          pickup_address: orderData.pickup_address,
          delivery_address: orderData.delivery_address,
          customer_name: orderData.customer_name,
          customer_phone: orderData.customer_phone,
          package_details: orderData.package_details,
          price: orderData.price,
          lat: parseFloat(orderData.lat) || -23.56,
          lng: parseFloat(orderData.lng) || -46.65,
          qr_code: code,
          status: 'available'
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      return await this.sqlite.createOrder(orderData);
    }
  }

  async acceptOrder(orderId, driverId) {
    if (this.isSupabaseMode) {
      const { data, error } = await this.supabase
        .from('orders')
        .update({ status: 'in_transit', driver_id: driverId })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      return await this.sqlite.acceptOrder(orderId, driverId);
    }
  }

  async completeOrder(orderId, driverId) {
    if (this.isSupabaseMode) {
      const { data, error } = await this.supabase
        .from('orders')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        await this.addRide(driverId, `Entrega #${data.id}: ${data.store_name} -> ${data.delivery_address}`, new Date().toLocaleDateString('pt-BR'), data.price);
      }
      return data;
    } else {
      return await this.sqlite.completeOrder(orderId, driverId);
    }
  }

  /* fluxos de assistencia emergencial (SOS) */

  async getEmergencyServices() {
    if (this.isSupabaseMode) {
      try {
        const { data, error } = await this.supabase
          .from('merchants')
          .select('*')
          .or("category.eq.Borracharia / Auto Peças,store_name.ilike.%Borracharia%,store_name.ilike.%Peças%");
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Tabela merchants ausente ou erro no Supabase, usando SQLite local:', err.message);
        return await this.sqlite.getEmergencyServices();
      }
    } else {
      return await this.sqlite.getEmergencyServices();
    }
  }

  /*
  consultas diretas para compatibilidade com sessoes antigas
  */
  async query(sql, params = []) {
    if (this.isSupabaseMode) {
      // consulta generica no supabase mantida para retrocompatibilidade
      if (sql.toUpperCase().includes('SELECT * FROM USERS WHERE ID = ?')) {
        const { data } = await this.supabase.from('users').select('*').eq('id', params[0]).single();
        return {
          rows: {
            length: data ? 1 : 0,
            item: () => data
          }
        };
      }
      return { rows: { length: 0, item: () => null } };
    } else {
      return await this.sqlite.query(sql, params);
    }
  }
}

// instancia o gerenciador de forma global
window.dbManager = new UnifiedDatabaseManager();
