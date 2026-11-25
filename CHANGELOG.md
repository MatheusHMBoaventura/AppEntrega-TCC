# 📄 CHANGELOG & DOCUMENTAÇÃO TÉCNICA - MOTOHELP (TCC)

Visão geral completa das funcionalidades implementadas, arquitetura do sistema, banco de dados e stack de tecnologias do **MotoHelp**.

---

## 🛠️ Tecnologias Utilizadas (Tech Stack)

### 🎨 Frontend & Interface
- **HTML5 Semantic**: Estruturação semântica, responsiva e acessível para dispositivos móveis.
- **Vanilla CSS3**: Sistema de design moderno utilizando CSS Custom Properties (variáveis), **Glassmorphism**, suporte a temas **Dark / Light Mode**, animações suaves de transição e micro-interações.
- **JavaScript (ES6+)**: Lógica da aplicação orientada a módulos assíncronos (`async/await`, `Promises`, manipulação direta de DOM).
- **FontAwesome 6.5**: Biblioteca de ícones vetoriais.

### 📱 Motor Híbrido & Mobile
- **Capacitor 8**: Empacotamento da pasta `www` como aplicativo **Android (APK)** via WebView (`npx cap sync`).

### 🗺️ Mapeamento, Geolocalização e Roteirização (100% Gratuito)
- **Leaflet.js (v1.9.4)**: Biblioteca interativa leve de mapas em camada vetorial.
- **OpenStreetMap / CartoDB Positron**: Provedor de tiles de mapas abertos sem limitação de uso ou necessidade de cartão de crédito.
- **OSRM (Open Source Routing Machine)**:
  - **Route API** (`/route/v1/driving`): Cálculo de rotas pelas vias urbanas reais com coordenadas GeoJSON.
  - **Table Matrix API** (`/table/v1/driving`): Obtenção de matrizes $N \times N$ de tempo (segundos) e distância (metros) entre múltiplos pontos.
- **Heurística própria de roteirização**: **Vizinho Mais Próximo (Nearest Neighbor)** + refinamento **2-Opt** para o Problema do Caixeiro Viajante aberto (origem fixa). Encontra um ótimo local; não usa OR-Tools e não garante a rota ótima global.

### 💾 Persistência Dupla de Dados (Nuvem + Offline)
- **Supabase Cloud (PostgreSQL)**: Banco de dados relacional na nuvem com Row Level Security (RLS), triggers de auditoria e função `complete_order`. O recurso Realtime não é utilizado.
- **WebSQL / localStorage**: Banco local de contingência (`LocalSQLiteManager`), usado quando o Supabase não está disponível ao abrir o app. Não há sincronização com a nuvem.

### 📷 Recursos de Hardware
- **HTML5 MediaDevices / getUserMedia**: Leitura e transmissão ao vivo de câmera para scanner de QR Code.
- **Web Audio API**: Síntese de efeitos sonoros nativos do sistema.

---

## 🚀 Funcionalidades Implementadas

### 1. 🔑 Autenticação & Perfis de Usuário Diferenciados
- **Dois Perfis no Sistema**:
  - 🛵 **Entregador (Moto)**: Cadastro específico com CPF, Placa da Motocicleta e CNH.
  - 🏪 **Lojista (Estabelecimento)**: Cadastro específico com Nome da Loja, CNPJ/CPF Comercial, Categoria do Negócio e Endereço.
- **Sessão Persistida**: Recuperação automática da última conta conectada ao reiniciar o aplicativo.
- **Alternância de Formulários**: Interface responsiva com seletor interativo de tipo de conta.

### 2. 🗺️ Rastreamento em Tempo Real & Mapa OSM
- **Marcador com Pulso Animado**: Ícone de motocicleta com radar verde em pulso contínuo (`.deliverer-marker-pulse`).
- **GPS de Alta Precisão**: Integração com `navigator.geolocation.watchPosition` com atualização instantânea da posição no mapa.
- **Botão de Recentralizar**: Centraliza o mapa instantaneamente na posição da moto.

### 3. 🧠 Roteirizador de Múltiplas Entregas (Matriz OSRM + 2-Opt)
- **Matriz de Tempo/Distância**: OSRM Table API consulta durações reais entre todos os pares de entregas.
- **Solver de Otimização 2-Opt**: Algoritmo que calcula a menor rota possível e reordena os pontos de entrega para máxima eficiência.
- **Marcadores Numerados**: Exibição de pins com os números exatos da ordem de parada no mapa (1, 2, 3, 4, 5, 6...).
- **Carga de 6 Entregas de Exemplo (SP)**: Botão de teste rápido com 6 locais reais de São Paulo.
- **Painel de Métricas**:
  - Distância Total em km.
  - Tempo Estimado Total em minutos.
  - Porcentagem de Economia de tempo/combustível calculada.

### 4. ⚙️ Detalhes & Manutenção Preventiva da Moto
- **Painel de Manutenção**:
  - ⛽ Consumo Médio (km/L).
  - 🛢️ Quilometragem da Troca de Óleo.
  - 🛞 Quilometragem da Troca de Pneus.
  - ⚙️ Quilometragem da Troca do Kit de Relação.
- **Previsão Automatizada**:
  - Próxima troca de Óleo (+3.000 km).
  - Próxima troca de Relação (+12.000 km).
  - Próxima troca de Pneus (+15.000 km).

### 5. 📷 Scanner de QR Code para Confirmação de Entregas
- Leitura dinâmica da câmera do celular.
- Simulador de leitura para testes em emulador.
- Entrada manual de código com validação.

### 6. 💳 Carteira Virtual & Métodos de Pagamento
- Exibição de saldo em conta.
- Cadastro e salvamento de cartões de crédito (Visa, Mastercard, Amex) no SQLite/Supabase.
- Seleção de cartão padrão.

### 7. 📍 Lugares Salvos (Favoritos) & Histórico de Viagens
- Inclusão e remoção de locais favoritos.
- Histórico completo das corridas e entregas realizadas pelo usuário.

### 8. 🌙 Configurações & Personalização
- Alternância entre **Modo Claro** e **Modo Escuro (Dark Theme)**.
- Ativação/Desativação de Notificações Push e Efeitos Sonoros.

---

## 📂 Estrutura dos Arquivos do Projeto

```
AppEntrega-TCC/
├── android/                        # Projeto Android nativo (Capacitor/Cordova)
├── schema.sql                      # Esquema relacional PostgreSQL/Supabase
├── seed.sql                        # Script de dados iniciais para desenvolvimento
├── CHANGELOG.md                    # Documentação técnica e histórico de versões
├── www/                            # Código fonte da aplicação Web/Híbrida
│   ├── index.html                  # Estrutura HTML5 da aplicação e modais
│   ├── index.css                   # Sistema de estilos Vanilla CSS
│   ├── index.js                    # Lógica principal, mapa, OSRM e heurística 2-Opt
│   ├── db.js                       # Gerenciador único de banco (Supabase + SQLite)
│   ├── map-config.js               # Configurações do Leaflet e servidores OSRM
│   └── supabase-config.js          # Configurações de credenciais da nuvem
```

---

## 📜 Histórico de Modificações (Changelog)

### Version 2.1.0 - 2026-11-25
- **Fix (roteirizador)**: marcadores numerados e métricas (km, minutos) voltaram a aparecer; a variável `marker` não era criada em `addNumberedStopMarkers`. O painel de sequência agora mostra a mesma ordem da lista e do mapa.
- **Security (XSS)**: dados de pedidos, histórico, locais, cartões, Nominatim e chat passam por `escapeHtml` antes de entrar em `innerHTML`.
- **Security (entrega)**: pedidos reais só são concluídos pelo QR Code; o botão "Concluir" de pedidos abre o leitor. No banco, a nova função `complete_order` valida entregador, status e código, e o trigger `enforce_order_rules` recusa conclusão direta, troca de entregador e alteração de preço após o aceite.
- **Security (RLS)**: `users` deixa de expor e-mail e telefone de todos os usuários; `audit_logs` não aceita mais eventos com `user_id` nulo; `qr_code` passa a ser único.
- **Security (senhas locais)**: PBKDF2-HMAC-SHA256 com salt no banco de contingência; removido o atalho que aceitava o próprio hash como senha; hashes SHA-256 antigos são regravados no login. A tela de recuperação não mostra mais a senha e usa `resetPasswordForEmail` do Supabase.
- **Feat (cadastro)**: perfil, entregador e lojista criados pelo trigger `handle_new_user` em `auth.users` (funciona com confirmação de e-mail ligada).
- **Fix (dados)**: no modo nuvem, o app não mistura mais pedidos de demonstração do banco local; contas de demonstração não têm a senha redefinida a cada abertura; logout encerra a sessão do Supabase Auth.
- **Chore**: Leaflet e supabase-js copiados para `www/vendor/` (sem dependência de CDN); `schema.sql` gerado a partir das migrations; suíte pgTAP corrigida (`throws_ok`) e ampliada para 33 testes; README e textos do app alinhados ao que o código faz.

### Version 2.0.0 - 2026-11-09
- **Rebranding**: Renomeação completa da aplicação e pacotes para **MotoHelp** (identificadores `com.motohelp.app` no Android/Capacitor, interfaces, títulos e documentação).
- **Security (§7.5)**: Eliminação integral de senhas em texto puro:
  - Criptografia com algoritmo **SHA-256** na camada de contingência local (`www/db.js`) e no módulo nativo Android ([`DatabaseHelper.java`](file:///c:/Users/Intersolid/Desktop/aaa/AppEntrega-TCC/android/app/src/main/java/com/motohelp/app/DatabaseHelper.java)).
  - Delegação formal da autenticação na nuvem para o **Supabase Auth** com hashing adaptativo **Bcrypt** no schema isolado `auth.users`.
  - Rotina automática de migração transparente de credenciais legadas (`migrateLegacyPasswords`) e higienização de objetos em memória (`delete user.password`).
  - Atualização dos scripts de carga e sementes de teste com `password_hash` ([`seed.js`](file:///c:/Users/Intersolid/Desktop/aaa/AppEntrega-TCC/seed.js) e [`seed_data.json`](file:///c:/Users/Intersolid/Desktop/aaa/AppEntrega-TCC/seed_data.json)).

### Version 1.3.0 - 2026-08-25
- **Feat**: Adicionado o Roteirizador de Entregas baseado em Matriz OSRM + heurística 2-Opt.
- **Feat**: Adicionado o Painel de Manutenção & Consumo da Moto (Óleo, Pneus, Relação, km/L).
- **Fix**: Resolvido crash em `switchTab` (`map.invalidateSize is not a function`).
- **Fix**: Resolvido erro de inicialização `bootstrap` no carregamento de sessões antigas.

### Version 1.2.0 - 2026-08-25
- **Feat**: Migração total para OpenStreetMap + Leaflet + OSRM Routing Machine (100% gratuito).
- **Feat**: Implementação de perfis de conta (Entregador Moto e Lojista).
- **Refactor**: Remoção de telas no estilo Uber passageiro para focar no mapa do entregador.

### Version 1.0.0 - 2026-08-25
- **Feat**: Lançamento inicial com login, cadastro, carteira virtual e suporte a Supabase/SQLite.
