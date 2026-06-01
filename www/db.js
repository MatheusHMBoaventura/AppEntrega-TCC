/*
gerenciador unificado de dados
integra sqlite local e supabase cloud
*/

/*
gerencia persistencia local sqlite e localstorage
serve como modo offline de contingencia
*/
class LocalSQLiteManager {
  constructor() {
    this.db = null;
    this.isWebSQL = false;
    this.dbName = 'AppEntregaDB';
    this.dbVersion = '1.0';
    this.dbDisplayName = 'AppEntrega Local Database';
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
        avatar TEXT
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
      );`
    ];
    for (const sql of queries) {
      await this.query(sql);
    }
  }

  async seedDefaultData() {
    const res = await this.query('SELECT * FROM users');
    if (res.rows.length === 0) {
      console.log('semeando usuario padrao joao silva');
      
      const userRes = await this.query(
        'INSERT INTO users (name, email, phone, password, avatar) VALUES (?, ?, ?, ?, ?)',
        [
          'João Silva', 
          'joao@email.com', 
          '(11) 98765-4321', 
          '123', 
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
        ]
      );
      
      const joaoId = String(userRes.insertId || '1');

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
    }

    // garante que o usuario matheus para testes locais seja semeado
    const checkMatheus = await this.query('SELECT * FROM users WHERE email = ?', ['matheus@email.com']);
    if (checkMatheus.rows.length === 0) {
      console.log('semeando usuario matheus');
      const matheusRes = await this.query(
        'INSERT INTO users (name, email, phone, password, avatar) VALUES (?, ?, ?, ?, ?)',
        [
          'Matheus Teste', 
          'matheus@email.com', 
          '(11) 99999-9999', 
          '123456', 
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
        ]
      );
      const matheusId = String(matheusRes.insertId);
      
      // insere cartao e local para o usuario matheus
      await this.query(
        'INSERT INTO places (user_id, type, title, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)',
        [matheusId, 'home', 'Casa', 'Av. Paulista, 2000 - Bela Vista', -23.5596, -46.6583]
      );
      await this.query(
        'INSERT INTO cards (user_id, brand, number, holder, expiry, is_default) VALUES (?, ?, ?, ?, ?, ?)',
        [matheusId, 'visa', '•••• •••• •••• 8888', 'MATHEUS TESTE', '12/32', 1]
      );
    }
  }

  async registerUser(name, email, phone, password) {
    const check = await this.query('SELECT * FROM users WHERE email = ?', [email]);
    if (check.rows.length > 0) throw new Error('E-mail já cadastrado localmente.');

    const avatarDefault = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
    const res = await this.query(
      'INSERT INTO users (name, email, phone, password, avatar) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, password, avatarDefault]
    );

    const newUserId = String(res.insertId);

    await this.query(
      'INSERT INTO places (user_id, type, title, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)',
      [newUserId, 'home', 'Casa', 'Av. Paulista, 2000 - Bela Vista', -23.5596, -46.6583]
    );
    await this.query(
      'INSERT INTO cards (user_id, brand, number, holder, expiry, is_default) VALUES (?, ?, ?, ?, ?, ?)',
      [newUserId, 'visa', '•••• •••• •••• 8888', name.toUpperCase(), '12/32', 1]
    );

    return { id: newUserId, name, email, phone, avatar: avatarDefault };
  }

  async loginUser(email, password) {
    const res = await this.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (res.rows.length === 0) throw new Error('E-mail ou senha incorretos.');
    return res.rows.item(0);
  }

  async updateUserProfile(userId, name, email, phone, avatar) {
    await this.query('UPDATE users SET name = ?, email = ?, phone = ?, avatar = ? WHERE id = ?', [name, email, phone, avatar, userId]);
    return { id: userId, name, email, phone, avatar };
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

  async registerUser(name, email, phone, password) {
    if (this.isSupabaseMode) {
      console.log(`cadastrando usuario ${email}`);
      
      // cadastra no supabase auth
      const { data, error } = await this.supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name,
            phone: phone
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Falha no cadastro do usuário.');

      const newUserId = data.user.id;
      const avatarDefault = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';

      // cria perfil publico na tabela users no postgresql
      const { error: profileError } = await this.supabase.from('users').insert({
        id: newUserId,
        name: name,
        email: email,
        phone: phone,
        avatar: avatarDefault
      });

      if (profileError) {
        throw new Error(`Erro ao criar perfil público no Supabase: ${profileError.message}`);
      }

      // configura dados padroes em nuvem para novos usuarios
      const { error: placeError } = await this.supabase.from('places').insert({
        user_id: newUserId,
        type: 'home',
        title: 'Casa',
        address: 'Av. Paulista, 2000 - Bela Vista',
        lat: -23.5596,
        lng: -46.6583
      });
      if (placeError) {
        throw new Error(`Erro ao configurar local favorito padrão: ${placeError.message}`);
      }

      const { error: cardError } = await this.supabase.from('cards').insert({
        user_id: newUserId,
        brand: 'visa',
        number: '•••• •••• •••• 8888',
        holder: name.toUpperCase(),
        expiry: '12/32',
        is_default: 1
      });
      if (cardError) {
        throw new Error(`Erro ao configurar método de pagamento padrão: ${cardError.message}`);
      }

      return { id: newUserId, name, email, phone, avatar: avatarDefault };
    } else {
      throw new Error('Modo off-line desativado. Conecte-se à internet para se cadastrar no Supabase.');
    }
  }

  async loginUser(email, password) {
    if (this.isSupabaseMode) {
      console.log(`login para ${email}`);
      // autentica com supabase auth
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;
      if (!data.user) throw new Error('E-mail ou senha incorretos.');

      // busca perfil publico do postgresql
      const { data: profile, error: profileErr } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

      if (profileErr || !profile) {
        // fallback caso nao encontre perfil
        return {
          id: data.user.id,
          name: data.user.user_metadata.name || 'Usuário Supabase',
          email: data.user.email,
          phone: data.user.user_metadata.phone || '',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
        };
      }

      return profile;
    } else {
      throw new Error('Modo off-line desativado. Conecte-se à internet para entrar.');
    }
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
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
      throw new Error('Modo off-line desativado. Conexão necessária com Supabase.');
    }
  }
}

// instancia o gerenciador de forma global
window.dbManager = new UnifiedDatabaseManager();
