# 📄 CHANGELOG & DOCUMENTAÇÃO TÉCNICA - APP ENTREGA (TCC)

Visão geral completa das funcionalidades implementadas, arquitetura do sistema, banco de dados e stack de tecnologias do **AppEntrega**.

---

## 🛠️ Tecnologias Utilizadas (Tech Stack)

### 🎨 Frontend & Interface
- **HTML5 Semantic**: Estruturação semântica, responsiva e acessível para dispositivos móveis.
- **Vanilla CSS3**: Sistema de design moderno utilizando CSS Custom Properties (variáveis), **Glassmorphism**, suporte a temas **Dark / Light Mode**, animações suaves de transição e micro-interações.
- **JavaScript (ES6+)**: Lógica da aplicação orientada a módulos assíncronos (`async/await`, `Promises`, manipulação direta de DOM).
- **FontAwesome 6.5**: Biblioteca de ícones vetoriais.

### 📱 Motor Híbrido & Mobile
- **Capacitor 5+ / Apache Cordova**: Compilação e empacotamento nativo para **Android (APK)** com sincronização de assets web em tempo real (`npx cap copy android`).

### 🗺️ Mapeamento, Geolocalização e Roteirização (100% Gratuito)
- **Leaflet.js (v1.9.4)**: Biblioteca interativa leve de mapas em camada vetorial.
- **OpenStreetMap / CartoDB Positron**: Provedor de tiles de mapas abertos sem limitação de uso ou necessidade de cartão de crédito.
- **OSRM (Open Source Routing Machine)**:
  - **Route API** (`/route/v1/driving`): Cálculo de rotas pelas vias urbanas reais com coordenadas GeoJSON.
  - **Table Matrix API** (`/table/v1/driving`): Obtenção de matrizes $N \times N$ de tempo (segundos) e distância (metros) entre múltiplos pontos.
- **Motor de Otimização (Estilo Google OR-Tools)**: Algoritmo próprio em JS aplicando **Vizinho Mais Próximo (Nearest Neighbor)** + **2-Opt Local Search** para solucionar o Problema do Caixeiro Viajante (Open TSP) de múltiplas entregas.

### 💾 Persistência Dupla de Dados (Nuvem + Offline)
- **Supabase Cloud (PostgreSQL)**: Banco de dados relacional na nuvem com suporte a Row Level Security (RLS) e sincronização em tempo real.
- **WebSQL / SQLite Local**: Banco relacional embutido no dispositivo para pleno funcionamento offline via `LocalSQLiteManager`.

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

### 3. 🧠 Roteirizador de Múltiplas Entregas (OSRM Matrix + OR-Tools Solver)
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
│   ├── index.js                    # Lógica principal, mapa, OSRM e solver OR-Tools
│   ├── db.js                       # Gerenciador único de banco (Supabase + SQLite)
│   ├── map-config.js               # Configurações do Leaflet e servidores OSRM
│   └── supabase-config.js          # Configurações de credenciais da nuvem
```

---

## 📜 Histórico de Modificações (Changelog)

### Version 1.3.0 - 2026-08-25
- **Feat**: Adicionado o Roteirizador de Entregas baseado em Matriz OSRM + Solver 2-Opt (OR-Tools).
- **Feat**: Adicionado o Painel de Manutenção & Consumo da Moto (Óleo, Pneus, Relação, km/L).
- **Fix**: Resolvido crash em `switchTab` (`map.invalidateSize is not a function`).
- **Fix**: Resolvido erro de inicialização `bootstrap` no carregamento de sessões antigas.

### Version 1.2.0 - 2026-08-25
- **Feat**: Migração total para OpenStreetMap + Leaflet + OSRM Routing Machine (100% gratuito).
- **Feat**: Implementação de perfis de conta (Entregador Moto e Lojista).
- **Refactor**: Remoção de telas no estilo Uber passageiro para focar no mapa do entregador.

### Version 1.0.0 - 2026-08-25
- **Feat**: Lançamento inicial com login, cadastro, carteira virtual e suporte a Supabase/SQLite.
