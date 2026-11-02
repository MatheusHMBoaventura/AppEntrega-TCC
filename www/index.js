/* secao
 * indexjs logica e estado do aplicativo de mobilidade urbana
 * features interactive map autocomplete active ride simulation
 * payments manager modals support chat bot sqlitewebsql integration
secao */

const initApp = () => {
  try {
  
  /* secao
 * 1 sistema de gerenciamento de estado application state
secao */
  const AppState = {
    // aba ativa atual
    activeTab: 'corridas',
    
    // usuario logado ativo carregado do sqlite
    activeUser: null,
    
    // cartoes de pagamento salvos carregados do sqlite
    cards: [],
    
    // lugares salvos carregados do sqlite
    savedPlaces: [],
    
    // lista de viagens do historico carregados do sqlite
    rides: [],
    
    // configuracoes do app
    settings: {
      darkMode: false,
      pushNotif: true,
      sounds: true
    },
    
    // estado da viagem ativa simulacao
    activeTrip: {
      status: 'idle', // idle selecting searching driveronway tripactive arrived
      category: 'standard',
      origin: { lat: -23.5615, lng: -46.6559, address: 'Av. Paulista, 1000' }, // localizacao inicial
      destination: null,
      driver: null,
      price: 0
    }
  };

  // coordenadas centrais av paulista sao paulo
  const MAP_CENTER = [-23.5615, -46.6559];

  // sugestoes de autocomplete mocks de sao paulo
  const LOCATION_SUGGESTIONS = [
    { name: 'Aeroporto de Congonhas', desc: 'Av. Washington Luís, s/n - Campo Belo, São Paulo', lat: -23.6273, lng: -46.6565, mult: 1.6 },
    { name: 'Parque do Ibirapuera', desc: 'Av. Pedro Álvares Cabral - Vila Mariana, São Paulo', lat: -23.5874, lng: -46.6576, mult: 1.0 },
    { name: 'Shopping Eldorado', desc: 'Av. Rebouças, 3970 - Pinheiros, São Paulo', lat: -23.5727, lng: -46.6961, mult: 1.2 },
    { name: 'Allianz Parque', desc: 'Rua Palestra Itália, 200 - Água Branca, São Paulo', lat: -23.5273, lng: -46.6784, mult: 1.4 },
    { name: 'Estação da Luz', desc: 'Praça da Luz, 1 - Centro Histórico, São Paulo', lat: -23.5362, lng: -46.6342, mult: 1.1 },
    { name: 'Av. Paulista, 2000', desc: 'Bela Vista, São Paulo - SP', lat: -23.5596, lng: -46.6583, mult: 0.9 }
  ];

  // dados dos motoristas simulados
  const MOCK_DRIVERS = [
    { name: 'Bruno Ramos', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150', rating: '4.9', car: 'Toyota Corolla Cinza', plate: 'BRA3G22', latOffset: 0.006, lngOffset: -0.005 },
    { name: 'Camila Costa', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150', rating: '4.8', car: 'Hyundai HB20 Prata', plate: 'HPB8D43', latOffset: -0.005, lngOffset: 0.007 },
    { name: 'Marcos Souza', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150', rating: '4.7', car: 'Chevrolet Onix Preto', plate: 'ONX5F22', latOffset: 0.008, lngOffset: 0.004 }
  ];

  /* secao
 * 2 referencias do dom dom elements
secao */
  const dom = {
    // elementos principais
    appContainer: document.getElementById('app-container'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    viewPanels: document.querySelectorAll('.view-panel'),
    toastContainer: document.getElementById('toast-container'),
    
    // perfil e drawer
    btnProfileTrigger: document.getElementById('btn-profile-trigger'),
    profileDrawer: document.getElementById('profile-drawer'),
    profileDrawerOverlay: document.getElementById('profile-drawer-overlay'),
    btnCloseProfile: document.getElementById('btn-close-profile'),
    userDisplayName: document.getElementById('user-display-name'),
    userDisplayEmail: document.getElementById('user-display-email'),
    userAvatarImg: document.getElementById('user-avatar-img'),
    
    // busca autocomplete
    inputDestination: document.getElementById('input-destination'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    searchSuggestions: document.getElementById('search-suggestions'),
    
    // fabs
    fabPayment: document.getElementById('fab-payment'),
    fabQuick: document.getElementById('fab-quick'),
    
    // bottom sheets
    rideOptionsSheet: document.getElementById('ride-options-sheet'),
    btnCloseRideSheet: document.getElementById('btn-close-ride-sheet'),
    routeStartText: document.getElementById('route-start-text'),
    routeEndText: document.getElementById('route-end-text'),
    categoryCards: document.querySelectorAll('.category-card'),
    btnConfirmRide: document.getElementById('btn-confirm-ride'),
    btnSheetPaymentSelect: document.getElementById('btn-sheet-payment-select'),
    sheetSelectedPayment: document.getElementById('sheet-selected-payment'),
    
    // bottom sheet corrida ativa
    tripStatusSheet: document.getElementById('trip-status-sheet'),
    tripStatusTitle: document.getElementById('trip-status-title'),
    driverAvatar: document.getElementById('driver-avatar'),
    driverName: document.getElementById('driver-name'),
    driverCarInfo: document.getElementById('driver-car-info'),
    driverPlate: document.getElementById('driver-plate'),
    driverRatingVal: document.getElementById('driver-rating-val'),
    tripProgressBar: document.getElementById('trip-progress-bar'),
    tripEtaStatus: document.getElementById('trip-eta-status'),
    tripDistanceStatus: document.getElementById('trip-distance-status'),
    btnCancelTrip: document.getElementById('btn-cancel-trip'),
    btnChatDriver: document.getElementById('btn-chat-driver'),
    
    // telas auxiliares
    historyList: document.getElementById('history-list'),
    accordionItems: document.querySelectorAll('.accordion-item'),
    
    // modais e formularios
    modals: document.querySelectorAll('.modal'),
    modalEditProfile: document.getElementById('modal-edit-profile'),
    modalPayments: document.getElementById('modal-payments'),
    modalSavedPlaces: document.getElementById('modal-saved-places'),
    modalSettings: document.getElementById('modal-settings'),
    modalPrivacy: document.getElementById('modal-privacy'),
    modalSupportChat: document.getElementById('modal-support-chat'),
    savedPlacesList: document.getElementById('saved-places-list'),
    btnAddSavedPlace: document.getElementById('btn-add-saved-place'),
    
    // botoes do menu lateral
    menuBtnEditProfile: document.getElementById('menu-btn-edit-profile'),
    menuBtnPayments: document.getElementById('menu-btn-payments'),
    menuBtnSavedPlaces: document.getElementById('menu-btn-saved-places'),
    menuBtnSettings: document.getElementById('menu-btn-settings'),
    menuBtnPrivacy: document.getElementById('menu-btn-privacy'),
    menuBtnLogout: document.getElementById('menu-btn-logout'),
    
    // forms
    formEditProfile: document.getElementById('form-edit-profile'),
    inputProfileName: document.getElementById('input-profile-name'),
    inputProfileEmail: document.getElementById('input-profile-email'),
    inputProfilePhone: document.getElementById('input-profile-phone'),
    editAvatarPreview: document.getElementById('edit-avatar-preview'),
    btnChangeAvatarRandom: document.getElementById('btn-change-avatar-random'),
    
    // configuracoes
    toggleDarkMode: document.getElementById('toggle-dark-mode'),
    togglePushNotif: document.getElementById('toggle-push-notif'),
    toggleSounds: document.getElementById('toggle-sounds'),
    
    // cartoes
    paymentCardsList: document.getElementById('payment-cards-list'),
    btnToggleAddCard: document.getElementById('btn-toggle-add-card'),
    addCardFormWrapper: document.getElementById('add-card-form-wrapper'),
    formAddCard: document.getElementById('form-add-card'),
    inputCardNumber: document.getElementById('input-card-number'),
    inputCardHolder: document.getElementById('input-card-holder'),
    inputCardExpiry: document.getElementById('input-card-expiry'),
    inputCardCvv: document.getElementById('input-card-cvv'),
    previewCardBg: document.getElementById('preview-card-bg'),
    previewCardBrand: document.getElementById('preview-card-brand'),
    previewCardNumber: document.getElementById('preview-card-number'),
    previewCardHolder: document.getElementById('preview-card-holder'),
    previewCardExpiry: document.getElementById('preview-card-expiry'),
    
    // chat
    chatMessagesContainer: document.getElementById('chat-messages-container'),
    inputChatMessage: document.getElementById('input-chat-message'),
    btnSendChatMsg: document.getElementById('btn-send-chat-msg'),
    chatSubjectTitle: document.getElementById('chat-subject-title'),
    chatBoldSubject: document.getElementById('chat-bold-subject'),

    // tela de autenticacao login cadastro
    authScreen: document.getElementById('auth-screen'),
    authLoginBox: document.getElementById('auth-login-box'),
    authSignupBox: document.getElementById('auth-signup-box'),
    formLogin: document.getElementById('form-login'),
    formSignup: document.getElementById('form-signup'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    signupName: document.getElementById('signup-name'),
    signupEmail: document.getElementById('signup-email'),
    signupPhone: document.getElementById('signup-phone'),
    signupPassword: document.getElementById('signup-password'),
    signupConfirmPassword: document.getElementById('signup-confirm-password'),
    btnGoSignup: document.getElementById('btn-go-signup'),
    btnGoLogin: document.getElementById('btn-go-login')
  };

  /* secao
 * 3 gerenciador de abas superiores tabs system
secao */
  dom.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  function switchTab(tabId) {
    AppState.activeTab = tabId;
    
    // atualizar abas visuais
    dom.tabButtons.forEach(b => {
      if (b.getAttribute('data-tab') === tabId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // mostrar painel correspondente
    dom.viewPanels.forEach(p => {
      if (p.id === `view-${tabId}`) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // carregar dados da aba selecionada
    if (tabId === 'fretes' && typeof renderFretesList === 'function') {
      renderFretesList();
    } else if (tabId === 'pedidos-loja' && typeof renderStoreOrdersList === 'function') {
      renderStoreOrdersList();
    } else if (tabId === 'historico' && typeof renderHistoryList === 'function') {
      renderHistoryList();
    }

    // fazer scroll do mapa caso volte para corridas
    if (tabId === 'corridas' && mapInstance) {
      setTimeout(() => {
        if (typeof mapInstance.invalidateSize === 'function') {
          mapInstance.invalidateSize();
        }
        if (typeof mapInstance.panTo === 'function') {
          mapInstance.panTo([currentCoords.lat, currentCoords.lng]);
        }
      }, 300);
    }
    
    playSystemSound();
  }

  /* secao
   * 3.5 validadores de documentos brasileiros (CPF, CNH, Placa)
  secao */

  /** Valida CPF usando dígito verificador oficial */
  function validateCPF(cpf) {
    const c = cpf.replace(/\D/g, '');
    if (c.length !== 11 || /^(.)\1{10}$/.test(c)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
    let rem = (sum * 10) % 11;
    if (rem === 10 || rem === 11) rem = 0;
    if (rem !== parseInt(c[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
    rem = (sum * 10) % 11;
    if (rem === 10 || rem === 11) rem = 0;
    return rem === parseInt(c[10]);
  }

  /** Valida CNH: 11 dígitos, algoritmo DENATRAN */
  function validateCNH(cnh) {
    const c = cnh.replace(/\D/g, '');
    if (c.length !== 11 || /^(.)\1{10}$/.test(c)) return false;
    let acc = 0;
    for (let i = 0, j = 9; i < 9; i++, j--) acc += parseInt(c[i]) * j;
    let first = acc % 11;
    const dst = first >= 10 ? 1 : 0;
    if (first >= 10) first = 0;
    acc = 0;
    for (let i = 0, j = 1; i < 9; i++, j++) acc += parseInt(c[i]) * j;
    let second = (acc % 11) - dst;
    if (second < 0) second += 11;
    if (second >= 10) second = 0;
    return parseInt(c[9]) === first && parseInt(c[10]) === second;
  }

  /** Valida Placa Brasileira: formato antigo (AAA-1234) ou Mercosul (AAA1A23) */
  function validatePlate(plate) {
    const p = plate.replace(/[\s\-]/g, '').toUpperCase();
    return /^[A-Z]{3}\d{4}$/.test(p) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(p);
  }

  /* secao
 * 4 mapa de rastreamento do entregador em tempo real (OpenStreetMap + Leaflet + OSRM Routing)
secao */
  let mapInstance = null;
  let delivererMarker = null;
  let activeRoutePolyline = null;
  let watchPositionId = null;
  let currentCoords = { lat: MAP_CENTER[0], lng: MAP_CENTER[1] };

  function getDelivererIcon() {
    if (typeof L === 'undefined') return null;
    return L.divIcon({
      className: 'deliverer-marker-container',
      html: `
        <div class="deliverer-marker-pulse"></div>
        <div class="deliverer-marker-pin">
          <i class="fa-solid fa-motorcycle"></i>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  function initMap() {
    if (typeof L === 'undefined') {
      console.warn('Leaflet JS nao foi carregado no documento');
      showToast('Mapa temporariamente indisponível no modo off-line.', 'info');
      return;
    }
    if (mapInstance) return;

    const config = window.MAP_CONFIG || {};
    const tileUrl = config.tileUrl || 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const tileAttr = config.tileAttribution || '&copy; OpenStreetMap contributors';

    // Inicializar Mapa Leaflet com OpenStreetMap
    mapInstance = L.map('map', {
      center: [currentCoords.lat, currentCoords.lng],
      zoom: config.defaultZoom || 16,
      zoomControl: false
    });

    L.tileLayer(tileUrl, {
      attribution: tileAttr,
      maxZoom: 20
    }).addTo(mapInstance);

    // Adicionar marcador do entregador em tempo real (Moto)
    delivererMarker = L.marker([currentCoords.lat, currentCoords.lng], { icon: getDelivererIcon() }).addTo(mapInstance);

    // Permitir adicionar paradas clicando diretamente no mapa
    mapInstance.on('click', (e) => {
      const { lat, lng } = e.latlng;
      L.popup()
        .setLatLng([lat, lng])
        .setContent(`
          <div style="font-size:0.82rem; text-align:center; padding:4px;">
            <b>Ponto Selecionado</b><br>
            <span style="font-size:0.7rem; color:#64748b;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span><br>
            <button id="btn-popup-add-stop" style="background:#10b981; color:#fff; border:none; padding:6px 12px; border-radius:6px; margin-top:6px; font-weight:700; cursor:pointer;">
              <i class="fa-solid fa-plus"></i> Adicionar à Rota
            </button>
          </div>
        `)
        .openOn(mapInstance);

      setTimeout(() => {
        const btn = document.getElementById('btn-popup-add-stop');
        if (btn) {
          btn.onclick = () => {
            const stopName = prompt('Nome ou cliente desta parada:') || `Ponto (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
            currentStopsList.push({ name: stopName, lat, lng });
            renderStopsList();
            mapInstance.closePopup();
            showToast(`Ponto "${stopName}" adicionado à lista de entregas!`, 'success');
          };
        }
      }, 100);
    });

    // Iniciar rastreamento de localização GPS
    startDelivererLocationTracking();

    // Carregar POIs imediatamente com o centro atual (antes do GPS confirmar)
    // Isso evita espera caso o GPS demore
    setTimeout(() => {
      if (!hasCenteredOnUser) {
        loadMapNearbyPOIs(currentCoords.lat, currentCoords.lng);
      }
    }, 1500);
  }

  let hasCenteredOnUser = false;

  function startDelivererLocationTracking() {
    if ('geolocation' in navigator) {
      // Primeiro tenta obter posição imediata (getCurrentPosition) para ter POIs rápidos
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          updateDelivererLocation(lat, lng);
        },
        (err) => {
          console.warn('GPS getCurrentPosition falhou:', err.message);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
      );

      // watchPosition para atualizações contínuas
      watchPositionId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          updateDelivererLocation(lat, lng);
        },
        (err) => {
          console.warn('GPS indisponivel ou permissao pendente. Usando localizacao base:', err.message);
          updateDelivererLocation(MAP_CENTER[0], MAP_CENTER[1]);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    }
  }

  function updateDelivererLocation(lat, lng) {
    currentCoords = { lat, lng };

    if (delivererMarker && mapInstance) {
      delivererMarker.setLatLng([lat, lng]);

      // Na primeira obtenção de GPS, centraliza a câmera na localização real do usuário
      if (!hasCenteredOnUser) {
        mapInstance.setView([lat, lng], 16);
        hasCenteredOnUser = true;
        // Carrega POIs reais com a coordenada GPS confirmada (com force=true para substituir qualquer prévia)
        loadMapNearbyPOIs(lat, lng, true);
      }
    }

    const mapStatusText = document.getElementById('map-status-text');
    if (mapStatusText) {
      mapStatusText.innerText = `GPS Ativo (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  }

  // OSRM (Open Source Routing Machine) - Cálculo de Rotas Gratuito
  async function fetchOSRMRoute(startLat, startLng, endLat, endLng) {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // OSRM retorna [lng, lat]
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.ceil(route.duration / 60);

        // Desenhar a rota no mapa Leaflet
        drawRoutePolyline(coordinates);

        return { coordinates, distanceKm, durationMin };
      }
    } catch (err) {
      console.warn('Erro ao consultar servidor OSRM:', err);
    }
    return null;
  }

  function drawRoutePolyline(latLngCoords) {
    if (typeof L === 'undefined' || !mapInstance) return;

    if (activeRoutePolyline) {
      mapInstance.removeLayer(activeRoutePolyline);
    }

    activeRoutePolyline = L.polyline(latLngCoords, {
      color: '#10b981',
      weight: 5,
      opacity: 0.85,
      lineCap: 'round'
    }).addTo(mapInstance);

    // Ajustar zoom para focar na rota completa
    mapInstance.fitBounds(activeRoutePolyline.getBounds(), { padding: [50, 50] });

    // Exibir botão flutuante de remover rota
    const btnCancelRoute = document.getElementById('btn-cancel-route');
    if (btnCancelRoute) {
      btnCancelRoute.classList.remove('hidden');
    }
  }

  // Função para remover e cancelar a rota ativa do mapa
  function clearActiveRoute() {
    if (activeRoutePolyline && mapInstance) {
      mapInstance.removeLayer(activeRoutePolyline);
      activeRoutePolyline = null;
    }
    if (window.activeSosMarker && mapInstance) {
      mapInstance.removeLayer(window.activeSosMarker);
      window.activeSosMarker = null;
    }
    const btnCancelRoute = document.getElementById('btn-cancel-route');
    if (btnCancelRoute) {
      btnCancelRoute.classList.add('hidden');
    }
    if (mapInstance && currentCoords) {
      mapInstance.setView([currentCoords.lat, currentCoords.lng], 16);
    }
    playSystemSound();
    showToast('📍 Rota removida do mapa!', 'info');
  }

  const btnCancelRoute = document.getElementById('btn-cancel-route');
  if (btnCancelRoute) {
    btnCancelRoute.addEventListener('click', clearActiveRoute);
  }

  // Botão flutuante de recentralizar mapa
  const fabRecenter = document.getElementById('fab-recenter');
  if (fabRecenter) {
    fabRecenter.addEventListener('click', () => {
      showToast('📍 Obtendo sua localização atual...', 'info');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          updateDelivererLocation(lat, lng);
          if (mapInstance) {
            mapInstance.setView([lat, lng], 16);
            loadMapNearbyPOIs(lat, lng, true);
            playSystemSound();
            showToast('📍 Localização centralizada!', 'success');
          }
        },
        () => {
          // Fallback: usa currentCoords mesmo (pode ser a última posição conhecida)
          if (mapInstance) {
            mapInstance.setView([currentCoords.lat, currentCoords.lng], 16);
            loadMapNearbyPOIs(currentCoords.lat, currentCoords.lng, true);
            showToast('📍 Centralizando na última posição conhecida.', 'info');
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    });
  }

  // ==========================================================================
  // PINS COM EMOJIS NO MAPA: POSTOS (⛽), BORRACHARIAS (🛞) E MECÂNICAS (🔧)
  // ==========================================================================
  let poiLayerGroup = null;
  let lastPoiFetchTime = 0;
  let lastPoiCenter = null;

  function haversineDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getPoiEmojiIcon(type) {
    let emoji = '🔧';
    let bg = 'linear-gradient(135deg, #7c3aed, #6d28d9)'; // Oficina (roxo)
    let shadow = 'rgba(124, 58, 237, 0.45)';

    if (type === 'fuel') {
      emoji = '⛽';
      bg = 'linear-gradient(135deg, #0284c7, #0369a1)'; // Posto de combustível (azul)
      shadow = 'rgba(2, 132, 199, 0.5)';
    } else if (type === 'tyres') {
      emoji = '🛞';
      bg = 'linear-gradient(135deg, #ea580c, #c2410c)'; // Borracharia (laranja/âmbar)
      shadow = 'rgba(234, 88, 12, 0.5)';
    } else if (type === 'motorcycle') {
      emoji = '🏍️';
      bg = 'linear-gradient(135deg, #0d9488, #0f766e)'; // Oficina de moto (verde-azulado)
      shadow = 'rgba(13, 148, 136, 0.5)';
    }

    return L.divIcon({
      className: 'emoji-poi-marker',
      html: `
        <div class="emoji-poi-bubble" style="
          background: ${bg};
          box-shadow: 0 4px 12px ${shadow};
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          cursor: pointer;
          transform: translateZ(0);
          transition: transform 0.2s ease;
        ">
          ${emoji}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20]
    });
  }

  // Servidores espelho Overpass para fallback de rede
  const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];

  async function fetchOverpassNearbyPOIs(lat, lng, radius) {
    // Query ampliada: postos de combustível, borracharias, mecânicas de moto e carro, auto peças
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="fuel"](around:${radius},${lat},${lng});
        way["amenity"="fuel"](around:${radius},${lat},${lng});
        node["shop"~"^(tyres|car_repair|motorcycle_repair|car_parts|auto_parts|workshop)$"](around:${radius},${lat},${lng});
        way["shop"~"^(tyres|car_repair|motorcycle_repair|car_parts|auto_parts|workshop)$"](around:${radius},${lat},${lng});
        node["craft"~"^(tyre_fitting|car_repair|motorcycle_repair)$"](around:${radius},${lat},${lng});
      );
      out center 30;
    `;

    let lastErr = null;

    for (const serverUrl of OVERPASS_SERVERS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos por servidor
      try {
        const resp = await fetch(serverUrl, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${serverUrl}`);
        const json = await resp.json();
        const elements = json.elements || [];
        if (elements.length > 0) {
          console.log(`✅ Overpass OK via ${serverUrl}: ${elements.length} resultados`);
          return elements;
        }
        // Servidor respondeu mas sem resultados, tenta o próximo
        lastErr = new Error('Nenhum resultado retornado');
      } catch (err) {
        clearTimeout(timeoutId);
        lastErr = err;
        console.warn(`⚠️ Overpass falhou em ${serverUrl}:`, err.message);
      }
    }

    throw lastErr || new Error('Todos os servidores Overpass falharam');
  }

  function showPoiLoadingIndicator(show) {
    // Indicador visual no mapa enquanto busca POIs
    let indicator = document.getElementById('poi-loading-indicator');
    if (show) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'poi-loading-indicator';
        indicator.style.cssText = [
          'position:absolute', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
          'background:rgba(15,23,42,0.88)', 'color:#fff', 'padding:7px 16px',
          'border-radius:20px', 'font-size:0.72rem', 'font-weight:600',
          'z-index:900', 'display:flex', 'align-items:center', 'gap:7px',
          'backdrop-filter:blur(8px)', 'box-shadow:0 2px 12px rgba(0,0,0,0.3)',
          'pointer-events:none', 'white-space:nowrap'
        ].join(';');
        indicator.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border:2px solid #38bdf8;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite"></span> Buscando postos e borracharias (5 km)...';
        // Garante que o estilo de animação existe
        if (!document.getElementById('poi-spin-style')) {
          const s = document.createElement('style');
          s.id = 'poi-spin-style';
          s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
          document.head.appendChild(s);
        }
        const mapEl = document.getElementById('map');
        if (mapEl) mapEl.style.position = 'relative';
        const mapParent = document.getElementById('map') || document.body;
        mapParent.appendChild(indicator);
      }
      indicator.style.display = 'flex';
    } else {
      if (indicator) indicator.style.display = 'none';
    }
  }

  async function loadMapNearbyPOIs(lat, lng, force = false) {
    if (!mapInstance || typeof L === 'undefined') return;

    if (!poiLayerGroup) {
      poiLayerGroup = L.layerGroup().addTo(mapInstance);
    }

    const now = Date.now();
    // Evitar requisições repetidas se não passou 60s e moveu menos de 500m
    if (!force && lastPoiCenter && (now - lastPoiFetchTime < 60000)) {
      const dist = haversineDistanceKm(lat, lng, lastPoiCenter.lat, lastPoiCenter.lng);
      if (dist < 0.5) return;
    }

    lastPoiFetchTime = now;
    lastPoiCenter = { lat, lng };

    showPoiLoadingIndicator(true);

    try {
      const elements = await fetchOverpassNearbyPOIs(lat, lng, 5000); // 5 km
      const places = elements
        .filter(el => el.tags)
        .map(el => {
          const elLat = el.lat || el.center?.lat;
          const elLng = el.lon || el.center?.lon;
          if (!elLat || !elLng) return null;

          const amenity = el.tags.amenity || '';
          const shop = el.tags.shop || '';
          const craft = el.tags.craft || '';
          let type = 'car_repair';

          if (amenity === 'fuel') {
            type = 'fuel';
          } else if (shop === 'tyres' || craft === 'tyre_fitting') {
            type = 'tyres';
          } else if (
            shop === 'motorcycle_repair' ||
            craft === 'motorcycle_repair'
          ) {
            type = 'motorcycle';
          }

          const distKm = haversineDistanceKm(lat, lng, elLat, elLng);
          const defaultName =
            type === 'fuel' ? 'Posto de Combustível' :
            type === 'tyres' ? 'Borracharia' :
            type === 'motorcycle' ? 'Oficina de Moto' :
            'Mecânica / Auto Peças';

          return {
            name: el.tags.name || el.tags['name:pt'] || defaultName,
            address: [el.tags['addr:street'], el.tags['addr:housenumber']].filter(Boolean).join(', ') || 'Próximo à sua localização',
            phone: el.tags.phone || el.tags['contact:phone'] || el.tags['contact:mobile'] || '',
            type,
            lat: elLat,
            lng: elLng,
            distKm
          };
        })
        .filter(p => p && p.distKm <= 5.0)
        .sort((a, b) => a.distKm - b.distKm)
        .slice(0, 15); // Máximo 15 pins

      showPoiLoadingIndicator(false);

      if (places.length === 0) {
        console.warn('Overpass retornou resultados mas nenhum válido na área de 5 km.');
        showToast('⛽ Nenhum posto ou borracharia encontrado em 5 km.', 'info');
        return;
      }

      renderPoiMarkers(places);
      showToast(`⛽ ${places.length} locais encontrados em até 5 km`, 'success');
    } catch (err) {
      showPoiLoadingIndicator(false);
      console.warn('Overpass POIs falhou em todos os servidores:', err.message);
      showToast('⚠️ Não foi possível buscar postos em tempo real. Verifique sua conexão.', 'info');
      // Sem fallback simulado: se não há dados reais, não exibe pinos falsos
    }
  }

  function renderPoiMarkers(items) {
    if (!poiLayerGroup) return;
    poiLayerGroup.clearLayers();

    items.forEach(item => {
      const icon = getPoiEmojiIcon(item.type);
      const marker = L.marker([item.lat, item.lng], { icon });

      const emoji = item.type === 'fuel' ? '⛽' : item.type === 'tyres' ? '🛞' : item.type === 'motorcycle' ? '🏍️' : '🔧';
      const typeLabel = item.type === 'fuel' ? 'Posto de Gasolina' : item.type === 'tyres' ? 'Borracharia' : item.type === 'motorcycle' ? 'Oficina de Moto' : 'Oficina Mecânica';
      const distLabel = item.distKm < 1 ? `${Math.round(item.distKm * 1000)} m` : `${item.distKm.toFixed(1)} km`;
      const cleanPhone = (item.phone || '').replace(/\D/g, '');

      const popupContent = `
        <div style="font-family: inherit; min-width: 210px; text-align: left; padding: 2px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span style="font-size:1.6rem; line-height:1;">${emoji}</span>
            <div>
              <strong style="font-size:0.88rem; color:#0f172a; display:block; line-height:1.2;">${escapeHtml(item.name)}</strong>
              <span style="font-size:0.7rem; color:#64748b; font-weight:600;">${typeLabel} • ${distLabel} de você</span>
            </div>
          </div>
          <div style="font-size:0.72rem; color:#64748b; margin-bottom:8px;">
            <i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.address)}
          </div>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <button type="button" class="btn-popup-route" style="flex:1; background:#10b981; color:#fff; border:none; padding:7px 10px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
              <i class="fa-solid fa-diamond-turn-right"></i> Traçar Rota
            </button>
            ${cleanPhone ? `
              <a href="tel:${cleanPhone}" style="background:#0f172a; color:#fff; text-decoration:none; padding:7px 10px; border-radius:8px; font-weight:700; font-size:0.75rem; display:flex; align-items:center; justify-content:center; gap:4px;">
                <i class="fa-solid fa-phone"></i> Ligar
              </a>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.querySelector('.leaflet-popup .btn-popup-route');
          if (btn) {
            btn.onclick = async () => {
              mapInstance.closePopup();
              showToast(`📍 Traçando rota até ${item.name}...`, 'info');
              const startLat = currentCoords?.lat || item.lat;
              const startLng = currentCoords?.lng || item.lng;
              const route = await fetchOSRMRoute(startLat, startLng, item.lat, item.lng);
              if (route) {
                playSystemSound();
                showToast(`🚀 Rota traçada até ${item.name}: ${route.distanceKm} km (~${route.durationMin} min)`, 'success');
              }
            };
          }
        }, 50);
      });

      poiLayerGroup.addLayer(marker);
    });
  }

  /* --------------------------------------------------------------------------
     SISTEMA DE ROTEIRIZAÇÃO E OTIMIZAÇÃO DE ENTREGAS (OSRM MATRIX + OR-TOOLS)
     -------------------------------------------------------------------------- */
  let currentStopsList = [];
  let stopMarkers = [];

  const fabRouteOptimizer = document.getElementById('fab-route-optimizer');
  if (fabRouteOptimizer) {
    fabRouteOptimizer.addEventListener('click', () => {
      openModal('route-optimizer');
      if (currentStopsList.length === 0) {
        loadSampleStops();
      } else {
        renderStopsList();
      }
    });
  }

  const btnLoadSample6Stops = document.getElementById('btn-load-sample-6stops');
  if (btnLoadSample6Stops) {
    btnLoadSample6Stops.addEventListener('click', () => {
      loadSampleStops();
      showToast('📦 6 Entregas de exemplo carregadas em São Paulo!', 'info');
    });
  }

  const btnClearStops = document.getElementById('btn-clear-stops');
  if (btnClearStops) {
    btnClearStops.addEventListener('click', () => {
      currentStopsList = [];
      clearStopMarkersFromMap();
      if (activeRoutePolyline && mapInstance) {
        mapInstance.removeLayer(activeRoutePolyline);
        activeRoutePolyline = null;
      }
      renderStopsList();
      updateActiveDeliveryUI();
      document.getElementById('route-solution-panel')?.classList.add('hidden');
      showToast('Paradas removidas.', 'info');
    });
  }

  // Busca Inteligente de Endereço via Nominatim OSM (100% Gratuito)
  const btnSearchStopAddress = document.getElementById('btn-search-stop-address');
  const inputSearchStopAddress = document.getElementById('input-search-stop-address');
  const searchAddressResults = document.getElementById('search-address-results');

  if (btnSearchStopAddress && inputSearchStopAddress) {
    const doSearch = async () => {
      const q = inputSearchStopAddress.value.trim();
      if (!q) {
        showToast('Digite um endereço para buscar!', 'error');
        return;
      }

      btnSearchStopAddress.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=br&limit=4`, {
          headers: { 'Accept-Language': 'pt-BR' }
        });
        const results = await resp.json();

        btnSearchStopAddress.innerHTML = '<i class="fa-solid fa-search"></i> Buscar';

        if (!results || results.length === 0) {
          showToast('Nenhum endereço encontrado. Tente ser mais específico.', 'info');
          if (searchAddressResults) searchAddressResults.classList.add('hidden');
          return;
        }

        if (searchAddressResults) {
          searchAddressResults.innerHTML = results.map(r => `
            <div class="search-result-item" data-lat="${r.lat}" data-lng="${r.lon}" data-name="${r.display_name.split(',')[0]}">
              <i class="fa-solid fa-location-dot"></i>
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.display_name}</span>
            </div>
          `).join('');
          searchAddressResults.classList.remove('hidden');

          searchAddressResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
              const lat = parseFloat(item.getAttribute('data-lat'));
              const lng = parseFloat(item.getAttribute('data-lng'));
              const name = item.getAttribute('data-name');

              const inputName = document.getElementById('input-new-stop-name');
              const inputLat = document.getElementById('input-new-stop-lat');
              const inputLng = document.getElementById('input-new-stop-lng');

              if (inputName) inputName.value = name;
              if (inputLat) inputLat.value = lat;
              if (inputLng) inputLng.value = lng;

              searchAddressResults.classList.add('hidden');
              showToast(`Endereço "${name}" selecionado! Clique em Adicionar Ponto.`, 'success');
            });
          });
        }
      } catch (err) {
        btnSearchStopAddress.innerHTML = '<i class="fa-solid fa-search"></i> Buscar';
        showToast('Erro ao buscar endereço.', 'error');
      }
    };

    btnSearchStopAddress.addEventListener('click', doSearch);
    inputSearchStopAddress.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch();
      }
    });
  }

  const btnAddCustomStop = document.getElementById('btn-add-custom-stop');
  if (btnAddCustomStop) {
    btnAddCustomStop.addEventListener('click', () => {
      const name = document.getElementById('input-new-stop-name')?.value.trim();
      const lat = parseFloat(document.getElementById('input-new-stop-lat')?.value);
      const lng = parseFloat(document.getElementById('input-new-stop-lng')?.value);

      if (!name || isNaN(lat) || isNaN(lng)) {
        showToast('Por favor, preencha o nome, latitude e longitude do ponto!', 'error');
        return;
      }

      currentStopsList.push({ name, lat, lng });
      document.getElementById('input-new-stop-name').value = '';
      document.getElementById('input-new-stop-lat').value = '';
      document.getElementById('input-new-stop-lng').value = '';

      renderStopsList();
      showToast(`Ponto "${name}" adicionado!`, 'success');
    });
  }

  function loadSampleStops() {
    currentStopsList = [
      { name: '📍 Partida (Localização Atual do Entregador)', lat: currentCoords.lat, lng: currentCoords.lng, isOrigin: true },
      { name: '📦 Entrega 1: Shopping Paulista', lat: -23.5705, lng: -46.6438, price: 'R$ 15,00', qrCode: 'ENT-10401' },
      { name: '📦 Entrega 2: Parque Ibirapuera', lat: -23.5874, lng: -46.6576, price: 'R$ 18,50', qrCode: 'ENT-10402' },
      { name: '📦 Entrega 3: Shopping Eldorado', lat: -23.5727, lng: -46.6961, price: 'R$ 14,00', qrCode: 'ENT-10403' },
      { name: '📦 Entrega 4: Estação da Luz', lat: -23.5362, lng: -46.6342, price: 'R$ 16,00', qrCode: 'ENT-10404' },
      { name: '📦 Entrega 5: MASP Avenida Paulista', lat: -23.5614, lng: -46.6558, price: 'R$ 12,00', qrCode: 'ENT-10405' },
      { name: '📦 Entrega 6: Allianz Parque', lat: -23.5273, lng: -46.6784, price: 'R$ 22,00', qrCode: 'ENT-10406' }
    ];
    renderStopsList();
  }

  function renderStopsList() {
    const stopsListElem = document.getElementById('stops-list');
    const stopsCountElem = document.getElementById('stops-count');

    if (stopsCountElem) stopsCountElem.innerText = currentStopsList.length;

    if (!stopsListElem) return;

    if (currentStopsList.length === 0) {
      stopsListElem.innerHTML = '<div style="text-align:center; padding:12px; font-size:0.8rem; color:#94a3b8;">Nenhuma parada adicionada.</div>';
      return;
    }

    stopsListElem.innerHTML = currentStopsList.map((stop, idx) => `
      <div class="stop-item-card">
        <div class="stop-info">
          <div class="stop-badge" style="${stop.isOrigin ? 'background-color:#10b981; color:#fff;' : ''}">${idx === 0 ? 'P' : idx}</div>
          <span class="stop-name">${stop.name}</span>
        </div>
        ${!stop.isOrigin ? `
          <button type="button" class="btn-remove-stop" data-idx="${idx}" title="Remover Parada">
            <i class="fa-solid fa-xmark"></i>
          </button>
        ` : '<span style="font-size:0.7rem; color:#10b981; font-weight:700;">Origem</span>'}
      </div>
    `).join('');

    stopsListElem.querySelectorAll('.btn-remove-stop').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        currentStopsList.splice(idx, 1);
        renderStopsList();
        updateActiveDeliveryUI();
      });
    });
  }

  // Execução do Solver de Otimização (OSRM Matrix + OR-Tools 2-Opt)
  const btnSolveRoute = document.getElementById('btn-solve-route');
  if (btnSolveRoute) {
    btnSolveRoute.addEventListener('click', async () => {
      if (currentStopsList.length < 2) {
        showToast('Adicione pelo menos 2 pontos para otimizar a rota!', 'error');
        return;
      }

      showToast('🧠 Calculando matriz OSRM e executando Solver de Otimização...', 'info');

      try {
        // 1. Obter matriz N x N de durações e distâncias via OSRM Table API
        const matrixData = await fetchOSRMMatrix(currentStopsList);
        
        // 2. Executar Solver (OR-Tools style: 2-Opt Local Search)
        const solution = solveOptimalRoute(matrixData.durations, currentStopsList.length);

        // 3. Obter geometria de rota contínua e distâncias reais
        const routeResult = await renderOptimizedRouteOnMap(currentStopsList, solution.bestRoute);

        // 4. Reordenar a lista de paradas com a solução ótima calculada
        currentStopsList = solution.bestRoute.map(idx => currentStopsList[idx]);
        renderStopsList();
        updateActiveDeliveryUI();

        // 5. Renderizar resultados no painel do modal
        renderRouteSolutionResults(currentStopsList, solution.bestRoute, routeResult, matrixData);
        closeModal(document.getElementById('modal-route-optimizer'));
        showToast('🚀 Rota ideal calculada e traçada no mapa com sucesso!', 'success');
      } catch (err) {
        console.error('Erro na roteirização:', err);
        showToast(err.message || 'Erro ao otimizar rota com OSRM.', 'error');
      }
    });
  }

  // 1. Matriz de Distância/Tempo OSRM
  async function fetchOSRMMatrix(points) {
    const coordsString = points.map(p => `${p.lng},${p.lat}`).join(';');
    const osrmTableUrl = `https://router.project-osrm.org/table/v1/driving/${coordsString}?annotations=duration,distance`;

    const response = await fetch(osrmTableUrl);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.durations) {
      throw new Error('Não foi possível obter a matriz de distâncias do OSRM.');
    }
    return {
      durations: data.durations, // Matriz N x N em segundos
      distances: data.distances  // Matriz N x N em metros
    };
  }

  // 2. Solver OR-Tools Style: Nearest Neighbor + 2-Opt Local Search (Open TSP)
  function solveOptimalRoute(matrix, numPoints) {
    // 2a. Caminho inicial Heurística Vizinho Mais Próximo
    let unvisited = new Set();
    for (let i = 1; i < numPoints; i++) unvisited.add(i);

    let route = [0];
    let curr = 0;

    while (unvisited.size > 0) {
      let nearest = null;
      let minCost = Infinity;
      for (let next of unvisited) {
        const cost = matrix[curr][next];
        if (cost < minCost) {
          minCost = cost;
          nearest = next;
        }
      }
      route.push(nearest);
      unvisited.delete(nearest);
      curr = nearest;
    }

    // 2b. Refinamento 2-Opt Local Search (Motor exato do OR-Tools para TSP)
    const getPathCost = (path) => {
      let c = 0;
      for (let i = 0; i < path.length - 1; i++) {
        c += matrix[path[i]][path[i + 1]];
      }
      return c;
    };

    let bestRoute = [...route];
    let bestCost = getPathCost(bestRoute);
    let improved = true;

    while (improved) {
      improved = false;
      for (let i = 1; i < bestRoute.length - 1; i++) {
        for (let k = i + 1; k < bestRoute.length; k++) {
          let newRoute = bestRoute.slice(0, i)
            .concat(bestRoute.slice(i, k + 1).reverse())
            .concat(bestRoute.slice(k + 1));

          let newCost = getPathCost(newRoute);
          if (newCost < bestCost) {
            bestCost = newCost;
            bestRoute = newRoute;
            improved = true;
          }
        }
      }
    }

    // Calcular custo sequencial sem otimização (0, 1, 2... N-1) para comparar economia
    let unoptimizedRoute = Array.from({ length: numPoints }, (_, i) => i);
    let unoptimizedCost = getPathCost(unoptimizedRoute);
    let savingsPercent = unoptimizedCost > 0 ? Math.max(0, Math.round(((unoptimizedCost - bestCost) / unoptimizedCost) * 100)) : 0;

    return { bestRoute, bestCost, savingsPercent };
  }

  // 3. Desenhar rota costurada e marcadores numerados das paradas no Leaflet
  async function renderOptimizedRouteOnMap(points, optimalOrder) {
    const orderedPoints = optimalOrder.map(idx => points[idx]);
    const coordsString = orderedPoints.map(p => `${p.lng},${p.lat}`).join(';');
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

    try {
      const resp = await fetch(routeUrl);
      const data = await resp.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        const coordinates = routeData.geometry.coordinates.map(c => [c[1], c[0]]);

        // Desenhar a rota no mapa Leaflet
        drawRoutePolyline(coordinates);

        // Adicionar marcadores numerados das paradas
        addNumberedStopMarkers(orderedPoints);

        const totalDistKm = (routeData.distance / 1000).toFixed(1);
        const totalDurationMin = Math.ceil(routeData.duration / 60);

        return { totalDistKm, totalDurationMin };
      }
    } catch (err) {
      console.warn('Erro ao obter rota OSRM:', err);
    }
    return null;
  }

  function addNumberedStopMarkers(orderedPoints) {
    clearStopMarkersFromMap();

    if (typeof L === 'undefined' || !mapInstance) return;

    orderedPoints.forEach((pt, idx) => {
      if (idx === 0) return; // O índice 0 é a moto do entregador que já possui marcador

      const stopIcon = L.divIcon({
        className: 'stop-numbered-marker-container',
        html: `
          <div style="background-color:#0f172a; color:#10b981; border:2px solid #fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.75rem; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            ${idx}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const popupHtml = `
        <div style="font-size:0.82rem; text-align:center; padding:4px;">
          <b>Parada ${idx}</b><br>
          <span style="font-size:0.75rem;">${pt.name}</span><br>
          ${pt.price ? `<span style="font-weight:700; color:#10b981; font-size:0.85rem;">${pt.price}</span><br>` : ''}
          <button onclick="window.completeSpecificStop(${idx})" style="background:#10b981; color:#fff; border:none; padding:6px 12px; border-radius:6px; margin-top:8px; font-weight:700; cursor:pointer; width:100%;">
            <i class="fa-solid fa-circle-check"></i> Concluir Entrega
          </button>
        </div>
      `;
      marker.bindPopup(popupHtml);
      stopMarkers.push(marker);
    });
  }

  function clearStopMarkersFromMap() {
    if (typeof L === 'undefined' || !mapInstance) return;
    stopMarkers.forEach(m => mapInstance.removeLayer(m));
    stopMarkers = [];
  }

  function renderRouteSolutionResults(points, optimalOrder, routeResult, matrixData) {
    const solutionPanel = document.getElementById('route-solution-panel');
    const metricDist = document.getElementById('metric-dist');
    const metricTime = document.getElementById('metric-time');
    const metricSaved = document.getElementById('metric-saved');
    const seqListElem = document.getElementById('optimized-sequence-list');

    if (!solutionPanel) return;

    solutionPanel.classList.remove('hidden');

    if (routeResult) {
      if (metricDist) metricDist.innerText = `${routeResult.totalDistKm} km`;
      if (metricTime) metricTime.innerText = `${routeResult.totalDurationMin} min`;
    }

    if (metricSaved) {
      const solution = solveOptimalRoute(matrixData.durations, points.length);
      metricSaved.innerText = `${solution.savingsPercent}%`;
    }

    if (seqListElem) {
      seqListElem.innerHTML = optimalOrder.map((ptIdx, orderIdx) => {
        const pt = points[ptIdx];
        return `
          <div class="seq-item">
            <div class="seq-num">${orderIdx === 0 ? 'P' : orderIdx}</div>
            <div class="seq-name">${pt.name}</div>
          </div>
        `;
      }).join('');
    }
  }

  /* secao
 * 7 menu de perfil drawer lateral profile drawer
secao */
  dom.btnProfileTrigger.addEventListener('click', () => {
    dom.profileDrawer.classList.add('active');
    playSystemSound();
  });

  dom.btnCloseProfile.addEventListener('click', closeProfileDrawer);
  dom.profileDrawerOverlay.addEventListener('click', closeProfileDrawer);

  function closeProfileDrawer() {
    dom.profileDrawer.classList.remove('active');
  }

  dom.menuBtnEditProfile.addEventListener('click', () => {
    closeProfileDrawer();
    openModal('edit-profile');
  });

  dom.menuBtnPayments.addEventListener('click', () => {
    closeProfileDrawer();
    openModal('payments');
  });

  dom.menuBtnSavedPlaces.addEventListener('click', () => {
    closeProfileDrawer();
    openModal('saved-places');
  });

  dom.menuBtnSettings.addEventListener('click', () => {
    closeProfileDrawer();
    openModal('settings');
  });

  dom.menuBtnPrivacy.addEventListener('click', () => {
    closeProfileDrawer();
    openModal('privacy');
  });

  // logout de sessao
  dom.menuBtnLogout.addEventListener('click', () => {
    closeProfileDrawer();
    logoutSession();
  });

  // botao $ na esquerda (Abre a Carteira)
  dom.fabPayment.addEventListener('click', () => {
    openModal('wallet');
    playSystemSound();
  });

  // botao + na direita (Abre a camera para ler QR Code diretamente)
  let cameraStream = null;

  dom.fabQuick.addEventListener('click', () => {
    openModal('qr-scanner');
    startCameraScanner();
    playSystemSound();
  });

  const btnCloseQrModal = document.getElementById('btn-close-qr-modal');
  if (btnCloseQrModal) {
    btnCloseQrModal.addEventListener('click', () => {
      stopCameraScanner();
    });
  }

  // simulacao e validacao manual de QR code
  const btnSimulateQr = document.getElementById('btn-simulate-qr');
  if (btnSimulateQr) {
    btnSimulateQr.addEventListener('click', () => {
      const mockQrCode = `ENT-${Math.floor(10000 + Math.random() * 90000)}`;
      processQrCodeRead(mockQrCode);
    });
  }

  const btnConfirmQrManual = document.getElementById('btn-confirm-qr-manual');
  if (btnConfirmQrManual) {
    btnConfirmQrManual.addEventListener('click', () => {
      const manualVal = document.getElementById('input-qr-manual')?.value.trim();
      if (!manualVal) {
        showToast('Por favor, digite o código da entrega!', 'error');
        return;
      }
      processQrCodeRead(manualVal);
    });
  }

  async function processQrCodeRead(code) {
    playSystemSound();
    stopCameraScanner();
    const qrModal = document.getElementById('modal-qr-scanner');
    if (qrModal) closeModal(qrModal);

    // Procurar parada correspondente ao código ou pegar a próxima parada ativa
    let targetIdx = currentStopsList.findIndex(s => s.qrCode === code);
    if (targetIdx === -1 && currentStopsList.length > 1) {
      targetIdx = 1; // Pega a primeira parada pendente
    }

    if (targetIdx > 0 && targetIdx < currentStopsList.length) {
      await completeStopByIndex(targetIdx, code);
    } else {
      showToast(`📦 Código ${code} lido com sucesso!`, 'info');
    }
  }

  async function completeStopByIndex(idx, qrCodeUsed = null) {
    const stop = currentStopsList[idx];
    if (!stop) return;

    showToast(`Concluindo entrega da parada ${idx}...`, 'info');

    try {
      if (stop.orderId && AppState.activeUser) {
        await window.dbManager.completeOrder(stop.orderId, AppState.activeUser.id);
      } else if (AppState.activeUser) {
        const now = new Date().toLocaleDateString('pt-BR');
        await window.dbManager.addRide(
          AppState.activeUser.id,
          stop.name,
          now,
          stop.price || 'R$ 15,00'
        );
      }

      // Remover a parada concluída da lista
      currentStopsList.splice(idx, 1);

      // Atualizar o histórico
      if (AppState.activeUser) {
        AppState.rides = await window.dbManager.getRides(AppState.activeUser.id);
        renderHistoryList();
      }

      // Se ainda restarem paradas, recalcular rota traçada
      if (currentStopsList.length > 1) {
        // Atualiza a origem como a posição atual
        currentStopsList[0].lat = currentCoords.lat;
        currentStopsList[0].lng = currentCoords.lng;
        const reOrdered = currentStopsList.map((_, i) => i);
        await renderOptimizedRouteOnMap(currentStopsList, reOrdered);
      } else {
        // Todas as paradas concluídas!
        clearStopMarkersFromMap();
        if (activeRoutePolyline && mapInstance) {
          mapInstance.removeLayer(activeRoutePolyline);
          activeRoutePolyline = null;
        }
      }

      renderStopsList();
      updateActiveDeliveryUI();
      playSystemSound();
      showToast(`🎉 Parada "${stop.name}" entregue com sucesso! Ganho registrado no histórico.`, 'success');
    } catch (err) {
      console.error('Erro ao concluir entrega:', err);
      showToast('Falha ao concluir entrega.', 'error');
    }
  }

  window.completeSpecificStop = (idx) => {
    completeStopByIndex(idx);
    if (mapInstance) mapInstance.closePopup();
  };

  function updateActiveDeliveryUI() {
    const card = document.getElementById('active-delivery-card');
    const badge = document.getElementById('active-stop-badge');
    const title = document.getElementById('active-stop-name');
    const sub = document.getElementById('active-stop-sub');

    if (!card) return;

    if (currentStopsList.length > 1) {
      const nextStop = currentStopsList[1];
      card.classList.remove('hidden');
      if (badge) badge.innerText = '1';
      if (title) title.innerText = nextStop.name;
      if (sub) sub.innerText = nextStop.price ? `Valor a receber: ${nextStop.price}` : 'Próxima parada na rota';
    } else {
      card.classList.add('hidden');
    }
  }

  const btnCompleteActiveDelivery = document.getElementById('btn-complete-active-delivery');
  if (btnCompleteActiveDelivery) {
    btnCompleteActiveDelivery.addEventListener('click', () => {
      if (currentStopsList.length > 1) {
        completeStopByIndex(1);
      }
    });
  }

  async function startCameraScanner() {
    const videoElem = document.getElementById('qr-video');
    const fallbackElem = document.getElementById('qr-camera-fallback');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoElem) {
          videoElem.srcObject = cameraStream;
          videoElem.play();
        }
        if (fallbackElem) fallbackElem.classList.add('hidden');
      } catch (err) {
        console.warn('camera nao disponivel ou permissao negada', err);
        if (fallbackElem) fallbackElem.classList.remove('hidden');
      }
    } else {
      if (fallbackElem) fallbackElem.classList.remove('hidden');
    }
  }

  function stopCameraScanner() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    const videoElem = document.getElementById('qr-video');
    if (videoElem) videoElem.srcObject = null;
  }

  if (dom.btnSheetPaymentSelect) {
    dom.btnSheetPaymentSelect.addEventListener('click', () => {
      openModal('payments');
    });
  }

  /* secao
 * 8 sistema de modais e subtelas modals manager
secao */
  function openModal(modalId) {
    const targetModal = document.getElementById(`modal-${modalId}`);
    if (targetModal) {
      // Fecha qualquer outro modal aberto para não acumular gavetas empilhadas
      document.querySelectorAll('.modal.active').forEach(m => {
        if (m !== targetModal) {
          m.classList.remove('active');
          m.classList.add('hidden');
        }
      });

      targetModal.classList.remove('hidden');
      targetModal.classList.add('active');
      playSystemSound();
      
      if (modalId === 'payments') {
        renderPaymentCardsList();
        resetAddCardForm();
      } else if (modalId === 'saved-places') {
        renderSavedPlacesList();
      } else if (modalId === 'wallet') {
        renderWalletUI();
      } else if (modalId === 'moto-details') {
        prefillMotoDetailsForm();
        renderManutList();
      } else if (modalId === 'sos') {
        renderSosMerchantsList();
      }
    }
  }

  const menuBtnMotoDetails = document.getElementById('menu-btn-moto-details');
  if (menuBtnMotoDetails) {
    menuBtnMotoDetails.addEventListener('click', () => {
      closeProfileDrawer();
      openModal('moto-details');
    });
  }

  function prefillMotoDetailsForm() {
    const user = AppState.activeUser || {};
    const consumption = user.fuel_consumption !== undefined && user.fuel_consumption !== null ? user.fuel_consumption : 35.0;
    const oilKm = user.last_oil_km || 0;
    const tiresKm = user.last_tires_km || 0;
    const chainKm = user.last_chain_km || 0;

    const inputCons = document.getElementById('input-moto-consumption');
    const inputOil = document.getElementById('input-moto-oil-km');
    const inputTires = document.getElementById('input-moto-tires-km');
    const inputChain = document.getElementById('input-moto-chain-km');

    if (inputCons) inputCons.value = consumption;
    if (inputOil) inputOil.value = oilKm;
    if (inputTires) inputTires.value = tiresKm;
    if (inputChain) inputChain.value = chainKm;

    updateMotoMaintenanceSummary(oilKm, tiresKm, chainKm);
  }

  function updateMotoMaintenanceSummary(oilKm, tiresKm, chainKm) {
    const elOil = document.getElementById('maint-oil-status');
    const elTires = document.getElementById('maint-tires-status');
    const elChain = document.getElementById('maint-chain-status');

    if (elOil) {
      const nextOil = oilKm > 0 ? (parseInt(oilKm) + 3000).toLocaleString('pt-BR') : '3.000';
      elOil.innerText = `Próxima troca recomendada nos ${nextOil} km (+3.000 km)`;
    }
    if (elTires) {
      const nextTires = tiresKm > 0 ? (parseInt(tiresKm) + 15000).toLocaleString('pt-BR') : '15.000';
      elTires.innerText = `Próxima troca recomendada nos ${nextTires} km (+15.000 km)`;
    }
    if (elChain) {
      const nextChain = chainKm > 0 ? (parseInt(chainKm) + 12000).toLocaleString('pt-BR') : '12.000';
      elChain.innerText = `Próxima troca recomendada nos ${nextChain} km (+12.000 km)`;
    }
  }

  const formMotoDetails = document.getElementById('form-moto-details');
  if (formMotoDetails) {
    formMotoDetails.addEventListener('submit', async (e) => {
      e.preventDefault();
      const consumption = parseFloat(document.getElementById('input-moto-consumption')?.value || 35.0);
      const oilKm = parseInt(document.getElementById('input-moto-oil-km')?.value || 0);
      const tiresKm = parseInt(document.getElementById('input-moto-tires-km')?.value || 0);
      const chainKm = parseInt(document.getElementById('input-moto-chain-km')?.value || 0);
      const odoKm = parseInt(document.getElementById('input-moto-odometer')?.value || 0);

      // Salva odômetro no armazenamento local de manutenção
      if (odoKm >= 0) {
        saveMotoOdometer(odoKm);
      }

      try {
        showToast('⚙️ Gravando configurações da moto...', 'info');
        const updated = await window.dbManager.updateMotoDetails(
          AppState.activeUser.id,
          consumption,
          oilKm,
          tiresKm,
          chainKm
        );

        AppState.activeUser = { ...AppState.activeUser, ...updated };
        updateMotoMaintenanceSummary(oilKm, tiresKm, chainKm);
        renderManutList();
        closeModal(document.getElementById('modal-moto-details'));
        showToast('🏍️ Detalhes e hodômetro da moto salvos com sucesso!', 'success');
      } catch (err) {
        showToast(err.message || 'Erro ao salvar detalhes da moto.', 'error');
      }
    });
  }

  // ==========================================================================
  // GERENCIAMENTO DE ABAS GENÉRICAS (.custom-tabs-nav)
  // ==========================================================================
  document.querySelectorAll('.custom-tabs-nav').forEach(nav => {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;

      const targetId = btn.getAttribute('data-tab');
      if (!targetId) return;

      const container = nav.closest('.modal-body') || nav.parentElement;
      if (!container) return;

      // Desativa abas irmãs
      nav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Alterna o conteúdo
      container.querySelectorAll('.custom-tab-content').forEach(content => {
        if (content.id === targetId) {
          content.classList.remove('hidden');
          content.classList.add('active');
        } else {
          content.classList.remove('active');
          content.classList.add('hidden');
        }
      });
      playSystemSound();
    });
  });

  // ==========================================================================
  // MÓDULO 1: CARTEIRA V2 & BALANÇO FINANCEIRO (GANHOS & GASTOS)
  // ==========================================================================
  const STORAGE_KEY_FINANCAS = 'rr_financas_v1';
  let activeWalletFilter = 'all';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getFinancasData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FINANCAS);
      if (!raw) {
        // Dados de exemplo amigáveis para primeiro uso
        const initial = {
          transactions: [
            {
              id: 'tx_demo_1',
              type: 'receita',
              category: 'Corridas / Fretes',
              description: 'Ganhos de entregas do dia',
              amount: 120.00,
              date: new Date().toISOString().split('T')[0]
            },
            {
              id: 'tx_demo_2',
              type: 'despesa',
              category: 'Gasolina / Combustível',
              description: 'Abastecimento Posto BR',
              amount: 25.00,
              date: new Date().toISOString().split('T')[0]
            }
          ]
        };
        localStorage.setItem(STORAGE_KEY_FINANCAS, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Erro ao ler finanças do localStorage:', e);
      return { transactions: [] };
    }
  }

  function saveFinancasData(data) {
    try {
      localStorage.setItem(STORAGE_KEY_FINANCAS, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao gravar finanças:', e);
    }
  }

  function formatBRL(val) {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function renderWalletUI(filter = activeWalletFilter) {
    activeWalletFilter = filter;
    const data = getFinancasData();
    const txs = Array.isArray(data.transactions) ? data.transactions : [];

    // Calcular totais
    let totalReceitas = 0;
    let totalDespesas = 0;

    txs.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'receita') {
        totalReceitas += amt;
      } else {
        totalDespesas += amt;
      }
    });

    const saldoLiquido = totalReceitas - totalDespesas;

    // Atualizar os 3 cartões no topo
    const elReceitas = document.getElementById('wallet-total-receitas');
    const elDespesas = document.getElementById('wallet-total-despesas');
    const elSaldo = document.getElementById('wallet-saldo-liquido');

    if (elReceitas) elReceitas.innerText = formatBRL(totalReceitas);
    if (elDespesas) elDespesas.innerText = formatBRL(totalDespesas);
    if (elSaldo) {
      elSaldo.innerText = formatBRL(saldoLiquido);
      elSaldo.className = 'stat-value ' + (saldoLiquido >= 0 ? 'text-success' : 'text-danger');
    }

    // Filtrar transações
    let filtered = [...txs];
    if (filter === 'receita') {
      filtered = filtered.filter(t => t.type === 'receita');
    } else if (filter === 'despesa') {
      filtered = filtered.filter(t => t.type === 'despesa');
    }

    // Ordenar da mais recente para a mais antiga
    filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Renderizar lista
    const container = document.getElementById('wallet-transactions-list');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-wallet-state">
          <i class="fa-solid fa-receipt"></i>
          <p>Nenhuma transação encontrada no momento.</p>
          <span style="font-size:0.75rem;">Adicione seus ganhos e gastos na aba <strong>Novo Lançamento</strong>.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(tx => {
      const isReceita = tx.type === 'receita';
      const iconClass = isReceita ? 'fa-arrow-up' : 'fa-arrow-down';
      const typeClass = isReceita ? 'receita' : 'despesa';
      const sign = isReceita ? '+' : '-';
      
      // Formatar data para DD/MM
      let dateFormatted = tx.date || '';
      if (dateFormatted.includes('-')) {
        const parts = dateFormatted.split('-');
        if (parts.length === 3) dateFormatted = `${parts[2]}/${parts[1]}`;
      }

      return `
        <div class="tx-card" id="tx-item-${tx.id}">
          <div class="tx-left">
            <div class="tx-icon-badge ${typeClass}">
              <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="tx-info">
              <span class="tx-title">${escapeHtml(tx.description || tx.category || 'Lançamento')}</span>
              <div class="tx-meta">
                <span class="tx-cat-badge">${escapeHtml(tx.category || '')}</span>
                <span>•</span>
                <span>${dateFormatted}</span>
              </div>
            </div>
          </div>
          <div class="tx-right">
            <span class="tx-val ${typeClass}">${sign} ${formatBRL(tx.amount)}</span>
            <button type="button" class="tx-del-btn" onclick="window.deleteWalletTransaction('${tx.id}')" title="Excluir">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.deleteWalletTransaction = function(id) {
    if (!confirm('Deseja realmente excluir esta transação da sua carteira?')) return;
    const data = getFinancasData();
    data.transactions = (data.transactions || []).filter(t => t.id !== id);
    saveFinancasData(data);
    renderWalletUI(activeWalletFilter);
    playSystemSound();
    showToast('Lançamento removido da carteira.', 'info');
  };

  // Filtros em pílula da carteira
  document.querySelectorAll('.wallet-filter-row .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.wallet-filter-row .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.getAttribute('data-filter') || 'all';
      renderWalletUI(filter);
    });
  });

  // Categorias por tipo de lançamento
  const CATEGORIAS_FINANCAS = {
    receita: [
      'Corridas / Fretes',
      'Gorjetas',
      'Bonificação / Metas',
      'Diária de Entrega',
      'Outro Ganho'
    ],
    despesa: [
      'Gasolina / Combustível',
      'Alimentação / Refeição',
      'Manutenção da Moto',
      'Troca de Óleo / Pneu',
      'Pedágio / Estacionamento',
      'Multas / Documento',
      'Outro Gasto'
    ]
  };

  function updateWalletCategoryOptions(type) {
    const sel = document.getElementById('input-tx-category');
    if (!sel) return;
    const cats = CATEGORIAS_FINANCAS[type] || CATEGORIAS_FINANCAS.receita;
    sel.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }

  // Toggle Tipo: Ganho vs Gasto
  const btnTypeReceita = document.getElementById('type-btn-receita');
  const btnTypeDespesa = document.getElementById('type-btn-despesa');
  const inputTxType = document.getElementById('input-tx-type');

  if (btnTypeReceita && btnTypeDespesa && inputTxType) {
    btnTypeReceita.addEventListener('click', () => {
      btnTypeReceita.classList.add('active');
      btnTypeDespesa.classList.remove('active');
      inputTxType.value = 'receita';
      updateWalletCategoryOptions('receita');
    });

    btnTypeDespesa.addEventListener('click', () => {
      btnTypeDespesa.classList.add('active');
      btnTypeReceita.classList.remove('active');
      inputTxType.value = 'despesa';
      updateWalletCategoryOptions('despesa');
    });
  }

  // Preencher data de hoje por padrão
  const inputTxDate = document.getElementById('input-tx-date');
  if (inputTxDate) {
    inputTxDate.value = new Date().toISOString().split('T')[0];
  }
  updateWalletCategoryOptions('receita');

  // Submit do formulário de novo lançamento
  const formAddTx = document.getElementById('form-add-transaction');
  if (formAddTx) {
    formAddTx.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = inputTxType ? inputTxType.value : 'receita';
      const amount = parseFloat(document.getElementById('input-tx-amount')?.value || 0);
      const category = document.getElementById('input-tx-category')?.value || 'Geral';
      const desc = document.getElementById('input-tx-desc')?.value.trim() || category;
      const date = document.getElementById('input-tx-date')?.value || new Date().toISOString().split('T')[0];

      if (!amount || amount <= 0) {
        showToast('Informe um valor válido maior que zero.', 'error');
        return;
      }

      const newTx = {
        id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        type,
        amount,
        category,
        description: desc,
        date
      };

      const data = getFinancasData();
      if (!Array.isArray(data.transactions)) data.transactions = [];
      data.transactions.unshift(newTx);
      saveFinancasData(data);

      // Limpar form
      if (document.getElementById('input-tx-amount')) document.getElementById('input-tx-amount').value = '';
      if (document.getElementById('input-tx-desc')) document.getElementById('input-tx-desc').value = '';

      // Voltar para a aba Extrato
      const tabExtratoBtn = document.getElementById('tab-btn-wallet-extrato');
      if (tabExtratoBtn) tabExtratoBtn.click();

      renderWalletUI('all');
      playSystemSound();
      showToast(`✓ ${type === 'receita' ? 'Ganho' : 'Gasto'} de ${formatBRL(amount)} registrado!`, 'success');
    });
  }

  // ==========================================================================
  // MÓDULO 2: MANUTENÇÃO PERSONALIZADA DA MOTO & HISTÓRICO
  // ==========================================================================
  const STORAGE_KEY_MANUT = 'rr_manutencao_v1';

  function getManutData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MANUT);
      if (!raw) {
        // Dados de exemplo amigáveis para demonstrar
        const initial = {
          odometer: 17500,
          records: [
            {
              id: 'manut_demo_1',
              item: 'Pneu Traseiro',
              kmRealizado: 17000,
              cost: 400.00,
              nextKm: 32000,
              date: new Date().toISOString().split('T')[0],
              notes: 'Pneu Pirelli novo - Borracharia do Zé'
            },
            {
              id: 'manut_demo_2',
              item: 'Óleo do Motor',
              kmRealizado: 15000,
              cost: 45.00,
              nextKm: 18000,
              date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
              notes: 'Mobil 10W30 + Troca de filtro'
            }
          ]
        };
        localStorage.setItem(STORAGE_KEY_MANUT, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Erro ao ler manutenção do localStorage:', e);
      return { odometer: 0, records: [] };
    }
  }

  function saveManutData(data) {
    try {
      localStorage.setItem(STORAGE_KEY_MANUT, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao gravar manutenção:', e);
    }
  }

  function saveMotoOdometer(km) {
    const data = getManutData();
    data.odometer = km;
    saveManutData(data);
  }

  // Sugestões inteligentes de intervalo para próxima troca (em KM)
  const INTERVALOS_RECOMENDADOS_KM = {
    'Óleo do Motor': 3000,
    'Pneu Traseiro': 15000,
    'Pneu Dianteiro': 20000,
    'Kit Relação (Coroa/Pinhão/Corrente)': 12000,
    'Pastilha de Freio': 8000,
    'Vela de Ignição': 12000,
    'Filtro de Ar / Combustível': 10000,
    'Bateria': 25000,
    'Revisão Geral': 10000,
    'Outro': 5000
  };

  const inputManutItem = document.getElementById('input-manut-item');
  const inputManutKm = document.getElementById('input-manut-km');
  const inputManutNextKm = document.getElementById('input-manut-next-km');

  function autoSuggestNextKm() {
    if (!inputManutKm || !inputManutNextKm || !inputManutItem) return;
    const currentKm = parseInt(inputManutKm.value || 0);
    const item = inputManutItem.value;
    const interval = INTERVALOS_RECOMENDADOS_KM[item] || 5000;
    if (currentKm > 0) {
      inputManutNextKm.value = currentKm + interval;
    }
  }

  if (inputManutItem) inputManutItem.addEventListener('change', autoSuggestNextKm);
  if (inputManutKm) inputManutKm.addEventListener('input', autoSuggestNextKm);

  // Inicializar data da troca para hoje
  const inputManutDate = document.getElementById('input-manut-date');
  if (inputManutDate) {
    inputManutDate.value = new Date().toISOString().split('T')[0];
  }

  // Botão rápido para ir da lista para a aba de novo registro
  const btnQuickAddManut = document.getElementById('btn-quick-add-manut');
  if (btnQuickAddManut) {
    btnQuickAddManut.addEventListener('click', () => {
      const tabNovaBtn = document.getElementById('tab-btn-manut-nova');
      if (tabNovaBtn) tabNovaBtn.click();
    });
  }

  function getManutIcon(item) {
    if (item.includes('Óleo')) return 'fa-oil-can';
    if (item.includes('Pneu')) return 'fa-circle-dot';
    if (item.includes('Relação')) return 'fa-gears';
    if (item.includes('Freio')) return 'fa-circle-stop';
    if (item.includes('Vela')) return 'fa-bolt';
    if (item.includes('Filtro')) return 'fa-wind';
    if (item.includes('Bateria')) return 'fa-car-battery';
    if (item.includes('Revisão')) return 'fa-toolbox';
    return 'fa-wrench';
  }

  function renderManutList() {
    const data = getManutData();
    const records = Array.isArray(data.records) ? data.records : [];
    const odometer = parseInt(data.odometer || 0);

    // Atualizar hodômetro no form de config
    const elOdoInput = document.getElementById('input-moto-odometer');
    if (elOdoInput && odometer > 0 && !elOdoInput.value) {
      elOdoInput.value = odometer;
    }

    // Calcular total gasto e contagem
    let totalInvestido = 0;
    records.forEach(r => {
      totalInvestido += (parseFloat(r.cost) || 0);
    });

    const elTotalGasto = document.getElementById('manut-total-gasto');
    const elTotalCount = document.getElementById('manut-total-count');

    if (elTotalGasto) elTotalGasto.innerText = formatBRL(totalInvestido);
    if (elTotalCount) elTotalCount.innerText = records.length;

    // Ordenar da troca com maior km / mais recente
    records.sort((a, b) => (b.kmRealizado || 0) - (a.kmRealizado || 0));

    const container = document.getElementById('manut-records-list');
    if (!container) return;

    if (records.length === 0) {
      container.innerHTML = `
        <div class="empty-wallet-state">
          <i class="fa-solid fa-wrench"></i>
          <p>Nenhuma manutenção registrada ainda.</p>
          <span style="font-size:0.75rem;">Clique no botão acima para registrar trocas de óleo, pneus e peças!</span>
        </div>
      `;
      return;
    }

    container.innerHTML = records.map(rec => {
      const icon = getManutIcon(rec.item);
      const kmFormatted = (rec.kmRealizado || 0).toLocaleString('pt-BR');
      const nextKmFormatted = rec.nextKm ? (rec.nextKm).toLocaleString('pt-BR') : null;
      
      // Calcular alerta de proximidade se tiver hodômetro e nextKm
      let nextKmTag = '';
      if (rec.nextKm) {
        if (odometer > 0) {
          const diff = rec.nextKm - odometer;
          if (diff <= 0) {
            nextKmTag = `<span class="manut-next-tag danger"><i class="fa-solid fa-triangle-exclamation"></i> Venceu há ${Math.abs(diff).toLocaleString('pt-BR')} km! Trocar agora</span>`;
          } else if (diff <= 1000) {
            nextKmTag = `<span class="manut-next-tag warning"><i class="fa-solid fa-clock"></i> Faltam apenas ${diff.toLocaleString('pt-BR')} km</span>`;
          } else {
            nextKmTag = `<span class="manut-next-tag"><i class="fa-solid fa-check"></i> Próxima: ${nextKmFormatted} km (faltam ${diff.toLocaleString('pt-BR')} km)</span>`;
          }
        } else {
          nextKmTag = `<span class="manut-next-tag"><i class="fa-solid fa-bell"></i> Próxima troca: ${nextKmFormatted} km</span>`;
        }
      }

      // Formatar data
      let dateFormatted = rec.date || '';
      if (dateFormatted.includes('-')) {
        const parts = dateFormatted.split('-');
        if (parts.length === 3) dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }

      return `
        <div class="manut-record-card" id="manut-item-${rec.id}">
          <div class="manut-card-header">
            <div class="manut-card-title-group">
              <div class="manut-card-icon">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div>
                <strong class="manut-card-item-name">${escapeHtml(rec.item)}</strong>
              </div>
            </div>
            <span class="manut-card-cost">${formatBRL(rec.cost)}</span>
          </div>

          <div class="manut-card-details">
            <span class="manut-detail-tag">
              <i class="fa-solid fa-gauge"></i> Feito com: <strong>${kmFormatted} km</strong>
            </span>
            <span class="manut-detail-tag">
              <i class="fa-solid fa-calendar"></i> ${dateFormatted}
            </span>
            ${rec.notes ? `<span class="manut-detail-tag"><i class="fa-solid fa-comment-dots"></i> ${escapeHtml(rec.notes)}</span>` : ''}
          </div>

          <div class="manut-card-footer">
            <div>${nextKmTag}</div>
            <button type="button" class="tx-del-btn" onclick="window.deleteManutRecord('${rec.id}')" title="Excluir Registro">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.deleteManutRecord = function(id) {
    if (!confirm('Deseja excluir este registro de manutenção?')) return;
    const data = getManutData();
    data.records = (data.records || []).filter(r => r.id !== id);
    saveManutData(data);
    renderManutList();
    playSystemSound();
    showToast('Registro de manutenção removido.', 'info');
  };

  // Submit do formulário de nova manutenção
  const formAddManut = document.getElementById('form-add-manut');
  if (formAddManut) {
    formAddManut.addEventListener('submit', (e) => {
      e.preventDefault();
      const item = document.getElementById('input-manut-item')?.value || 'Manutenção';
      const kmRealizado = parseInt(document.getElementById('input-manut-km')?.value || 0);
      const cost = parseFloat(document.getElementById('input-manut-cost')?.value || 0);
      const nextKmVal = document.getElementById('input-manut-next-km')?.value;
      const nextKm = nextKmVal ? parseInt(nextKmVal) : null;
      const date = document.getElementById('input-manut-date')?.value || new Date().toISOString().split('T')[0];
      const notes = document.getElementById('input-manut-notes')?.value.trim() || '';
      const toWallet = document.getElementById('check-manut-to-wallet')?.checked;

      if (isNaN(kmRealizado) || kmRealizado < 0) {
        showToast('Informe o Km da moto no momento da troca.', 'error');
        return;
      }
      if (isNaN(cost) || cost < 0) {
        showToast('Informe o valor gasto na manutenção.', 'error');
        return;
      }

      const newRecord = {
        id: 'manut_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        item,
        kmRealizado,
        cost,
        nextKm,
        date,
        notes
      };

      const data = getManutData();
      if (!Array.isArray(data.records)) data.records = [];
      data.records.unshift(newRecord);
      
      // Se o km da troca for maior que o hodômetro registrado, atualiza
      if (kmRealizado > (data.odometer || 0)) {
        data.odometer = kmRealizado;
      }
      saveManutData(data);

      // Se marcou para lançar na carteira, cria a despesa automaticamente
      if (toWallet && cost > 0) {
        const financasData = getFinancasData();
        if (!Array.isArray(financasData.transactions)) financasData.transactions = [];
        financasData.transactions.unshift({
          id: 'tx_manut_' + Date.now(),
          type: 'despesa',
          amount: cost,
          category: 'Manutenção da Moto',
          description: `${item} (${kmRealizado.toLocaleString('pt-BR')} km)`,
          date
        });
        saveFinancasData(financasData);
        showToast(`✓ Despesa de ${formatBRL(cost)} lançada na Carteira!`, 'info');
      }

      // Limpar form
      if (document.getElementById('input-manut-cost')) document.getElementById('input-manut-cost').value = '';
      if (document.getElementById('input-manut-notes')) document.getElementById('input-manut-notes').value = '';

      // Voltar para a aba de histórico
      const tabListaBtn = document.getElementById('tab-btn-manut-lista');
      if (tabListaBtn) tabListaBtn.click();

      renderManutList();
      playSystemSound();
      showToast(`🏍️ Manutenção de ${item} salva com sucesso!`, 'success');
    });
  }

  dom.modals.forEach(modal => {
    const closeBtn = modal.querySelector('.btn-close-modal');
    const overlay = modal.querySelector('.modal-overlay');
    
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));
    if (overlay) overlay.addEventListener('click', () => closeModal(modal));
  });

  function closeModal(modalElement) {
    if (modalElement) {
      modalElement.classList.remove('active');
      modalElement.classList.add('hidden');
    }
  }

  /* secao
 * 9 submodal formulario de edicao do perfil user profile data
secao */
  dom.formEditProfile.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = dom.inputProfileName.value;
    const email = dom.inputProfileEmail.value;
    const phone = dom.inputProfilePhone.value;
    const avatar = dom.editAvatarPreview.src;

    try {
      // gravar no sqlite
      const updated = await window.dbManager.updateUserProfile(
        AppState.activeUser.id,
        name,
        email,
        phone,
        avatar
      );

      // sincronizar estado
      AppState.activeUser = updated;

      // rerenderizar dados visuais
      dom.userDisplayName.innerText = updated.name;
      dom.userDisplayEmail.innerText = updated.email;
      dom.userAvatarImg.src = updated.avatar;
      
      // colocar foto redonda premium no cabecalho
      dom.btnProfileTrigger.innerHTML = `<img src="${updated.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;

      closeModal(dom.modalEditProfile);
      showToast('Perfil atualizado no SQLite!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  dom.btnChangeAvatarRandom.addEventListener('click', () => {
    const randomId = Math.floor(Math.random() * 70);
    dom.editAvatarPreview.src = `https://i.pravatar.cc/150?img=${randomId}`;
  });

  /* secao
 * 10 submodal metodos de pagamento e preview 3d de cartoes credit card
secao */
  function renderPaymentCardsList() {
    if (AppState.cards.length === 0) {
      dom.paymentCardsList.innerHTML = '<div style="text-align:center; padding:20px; font-size:0.8rem; color:var(--color-text-muted);">Nenhum cartão cadastrado.</div>';
      return;
    }

    dom.paymentCardsList.innerHTML = AppState.cards.map(card => `
      <div class="payment-card-item">
        <div class="card-item-left">
          <div class="card-brand-icon ${getBrandClass(card.brand)}">
            <i class="${getBrandIcon(card.brand)}"></i>
          </div>
          <div class="card-item-details">
            <span class="card-masked-num">${card.number}</span>
            ${card.is_default === 1 ? '<span class="card-default-badge">Padrão</span>' : ''}
          </div>
        </div>
        <div class="card-actions-right">
          ${card.is_default !== 1 ? `
            <button class="btn-card-action btn-set-default" data-id="${card.id}" title="Definir como padrão">
              <i class="fa-solid fa-star"></i>
            </button>
          ` : ''}
          <button class="btn-card-action btn-delete-card" data-id="${card.id}" title="Excluir Cartão">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
    `).join('');

    // eventos nos botoes da lista de cartoes
    dom.paymentCardsList.querySelectorAll('.btn-set-default').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        try {
          await window.dbManager.setCardDefault(AppState.activeUser.id, id);
          AppState.cards = await window.dbManager.getCards(AppState.activeUser.id);
          renderPaymentCardsList();
          updateSelectedPaymentOnSheet();
          showToast('Cartão padrão alterado no SQLite!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    dom.paymentCardsList.querySelectorAll('.btn-delete-card').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        
        if (AppState.cards.length <= 1) {
          showToast('Você deve manter ao menos um cartão de pagamento!', 'error');
          return;
        }
        
        try {
          await window.dbManager.deleteCard(AppState.activeUser.id, id);
          AppState.cards = await window.dbManager.getCards(AppState.activeUser.id);
          
          // se deletou o default define o primeiro como default
          if (!AppState.cards.some(c => c.is_default === 1)) {
            const firstId = AppState.cards[0].id;
            await window.dbManager.setCardDefault(AppState.activeUser.id, firstId);
            AppState.cards = await window.dbManager.getCards(AppState.activeUser.id);
          }
          
          renderPaymentCardsList();
          updateSelectedPaymentOnSheet();
          showToast('Cartão removido do SQLite!', 'info');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  function updateSelectedPaymentOnSheet() {
    const defaultCard = AppState.cards.find(c => c.is_default === 1);
    if (defaultCard) {
      const brandCapitalized = defaultCard.brand.charAt(0).toUpperCase() + defaultCard.brand.slice(1);
      dom.sheetSelectedPayment.innerText = `${brandCapitalized} final ${defaultCard.number.slice(-4)}`;
    } else {
      dom.sheetSelectedPayment.innerText = 'Nenhum meio de pagamento';
    }
  }

  dom.btnToggleAddCard.addEventListener('click', () => {
    dom.addCardFormWrapper.classList.toggle('active');
    dom.addCardFormWrapper.classList.toggle('hidden');
    dom.btnToggleAddCard.innerHTML = dom.addCardFormWrapper.classList.contains('active') 
      ? '<i class="fa-solid fa-xmark"></i> Cancelar'
      : '<i class="fa-solid fa-plus"></i> Adicionar Novo Cartão';
  });

  dom.inputCardNumber.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    let brand = 'default';
    if (value.startsWith('4')) brand = 'visa';
    else if (value.startsWith('5')) brand = 'mastercard';
    else if (value.startsWith('3')) brand = 'amex';

    dom.previewCardBg.className = `credit-card-preview card-bg-${brand === 'mastercard' ? 'master' : brand}`;
    dom.previewCardBrand.innerHTML = `<i class="${getBrandIcon(brand)}"></i>`;

    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += value[i];
    }
    e.target.value = formatted;
    dom.previewCardNumber.innerText = formatted || '•••• •••• •••• ••••';
  });

  dom.inputCardHolder.addEventListener('input', (e) => {
    dom.previewCardHolder.innerText = e.target.value.toUpperCase() || 'NOME COMPLETO';
  });

  dom.inputCardExpiry.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
    dom.previewCardExpiry.innerText = value || 'MM/AA';
  });

  dom.formAddCard.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const number = dom.inputCardNumber.value;
    const holder = dom.inputCardHolder.value.toUpperCase();
    const expiry = dom.inputCardExpiry.value;
    
    let brand = 'default';
    if (number.startsWith('4')) brand = 'visa';
    else if (number.startsWith('5')) brand = 'mastercard';
    else if (number.startsWith('3')) brand = 'amex';

    try {
      // inserir no sqlite
      const maskedNumber = `•••• •••• •••• ${number.slice(-4)}`;
      await window.dbManager.addCard(AppState.activeUser.id, brand, maskedNumber, holder, expiry);
      
      // recarregar
      AppState.cards = await window.dbManager.getCards(AppState.activeUser.id);
      
      renderPaymentCardsList();
      resetAddCardForm();
      showToast('Cartão inserido no SQLite!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  function resetAddCardForm() {
    dom.formAddCard.reset();
    dom.addCardFormWrapper.classList.remove('active');
    dom.addCardFormWrapper.classList.add('hidden');
    dom.btnToggleAddCard.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar Novo Cartão';
    
    dom.previewCardBg.className = 'credit-card-preview card-bg-default';
    dom.previewCardBrand.innerHTML = '<i class="fa-regular fa-credit-card"></i>';
    dom.previewCardNumber.innerText = '•••• •••• •••• ••••';
    dom.previewCardHolder.innerText = 'NOME COMPLETO';
    dom.previewCardExpiry.innerText = 'MM/AA';
  }

  function getBrandIcon(brand) {
    switch (brand) {
      case 'visa': return 'fa-brands fa-cc-visa brand-visa';
      case 'mastercard': return 'fa-brands fa-cc-mastercard brand-mastercard';
      case 'amex': return 'fa-brands fa-cc-amex brand-amex';
      default: return 'fa-regular fa-credit-card';
    }
  }

  function getBrandClass(brand) {
    return brand ? `brand-${brand}` : '';
  }

  /* secao
 * 11 submodal lugares salvos saved places data manager
secao */
  function renderSavedPlacesList() {
    if (AppState.savedPlaces.length === 0) {
      dom.savedPlacesList.innerHTML = '<div style="text-align:center; padding:20px; font-size:0.8rem; color:var(--color-text-muted);">Nenhum local favoritado.</div>';
      return;
    }

    dom.savedPlacesList.innerHTML = AppState.savedPlaces.map(place => `
      <div class="place-item">
        <div class="place-left">
          <div class="place-icon-wrapper">
            <i class="${getPlaceIcon(place.type)}"></i>
          </div>
          <div class="place-info">
            <span class="place-title">${place.title}</span>
            <span class="place-address">${place.address}</span>
          </div>
        </div>
        <button class="btn-delete-place" data-id="${place.id}" title="Remover dos Favoritos">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `).join('');

    // evento de deletar endereco salvo
    dom.savedPlacesList.querySelectorAll('.btn-delete-place').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        try {
          await window.dbManager.deletePlace(AppState.activeUser.id, id);
          AppState.savedPlaces = await window.dbManager.getPlaces(AppState.activeUser.id);
          renderSavedPlacesList();
          showToast('Local removido do SQLite!', 'info');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  dom.btnAddSavedPlace.addEventListener('click', async () => {
    const addresses = [
      { name: 'Parque do Ibirapuera', address: 'Av. Pedro Álvares Cabral - Vila Mariana, São Paulo', lat: -23.5874, lng: -46.6576, type: 'park' },
      { name: 'Academia SmartFit Paulista', address: 'Av. Paulista, 1500 - Bela Vista', lat: -23.5629, lng: -46.6543, type: 'gym' }
    ];

    const randomChoice = addresses[Math.floor(Math.random() * addresses.length)];
    
    if (AppState.savedPlaces.some(p => p.address === randomChoice.address)) {
      showToast('Este endereço já está nos favoritos!', 'error');
      return;
    }

    try {
      await window.dbManager.addPlace(
        AppState.activeUser.id,
        randomChoice.type,
        randomChoice.name,
        randomChoice.address,
        randomChoice.lat,
        randomChoice.lng
      );

      AppState.savedPlaces = await window.dbManager.getPlaces(AppState.activeUser.id);
      renderSavedPlacesList();
      showToast('Endereço inserido no SQLite!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  function getPlaceIcon(type) {
    switch (type) {
      case 'home': return 'fa-solid fa-house';
      case 'work': return 'fa-solid fa-briefcase';
      case 'park': return 'fa-solid fa-tree';
      case 'gym': return 'fa-solid fa-dumbbell';
      default: return 'fa-solid fa-location-dot';
    }
  }

  /* secao
 * 12 submodal configuracoes e controle de tema dark mode sounds
secao */
  dom.toggleDarkMode.addEventListener('change', (e) => {
    AppState.settings.darkMode = e.target.checked;
    if (AppState.settings.darkMode) {
      dom.appContainer.classList.add('dark-theme');
      showToast('🌙 Modo Escuro ativado!', 'info');
    } else {
      dom.appContainer.classList.remove('dark-theme');
      showToast('☀️ Modo Claro ativado!', 'info');
    }
    playSystemSound();
  });

  dom.togglePushNotif.addEventListener('change', (e) => {
    AppState.settings.pushNotif = e.target.checked;
    showToast(e.target.checked ? 'Notificações ativadas!' : 'Notificações desativadas.', 'info');
  });

  dom.toggleSounds.addEventListener('change', (e) => {
    AppState.settings.sounds = e.target.checked;
    showToast(e.target.checked ? 'Efeitos sonoros ativados!' : 'Efeitos sonoros silenciados.', 'info');
  });

  /* --------------------------------------------------------------------------
     ASSISTÊNCIA EMERGENCIAL (SOS) - BORRACHARIAS E OFICINAS
     -------------------------------------------------------------------------- */
  const fabSos = document.getElementById('fab-sos');
  if (fabSos) {
    fabSos.addEventListener('click', () => {
      openModal('sos');
    });
  }

  async function renderSosMerchantsList() {
    const listElem = document.getElementById('sos-merchants-list');
    if (!listElem) return;

    listElem.innerHTML = '<div style="text-align:center; padding:15px; color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Localizando socorro mecânico próximo...</div>';

    // Se já temos a coordenada real obtida pelo watchPosition, usa imediatamente sem esperar
    let lat = currentCoords?.lat;
    let lng = currentCoords?.lng;

    if (!hasCenteredOnUser) {
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 3500, maximumAge: 30000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        updateDelivererLocation(lat, lng);
      } catch (_) {
        lat = currentCoords?.lat || -23.5505;
        lng = currentCoords?.lng || -46.6333;
      }
    }

    const radiusMeters = 5000; // 5 km ao redor do entregador

    /**
     * Busca mecânicos / borracharias no OpenStreetMap via Overpass API pública otimizada
     */
    async function fetchOverpassNearby(lat, lng, radius) {
      const query = `
        [out:json][timeout:5];
        (
          node["shop"~"car_repair|tyres|motorcycle_repair"](around:${radius},${lat},${lng});
          node["amenity"="fuel"](around:${radius},${lat},${lng});
          way["shop"~"car_repair|tyres|motorcycle_repair"](around:${radius},${lat},${lng});
        );
        out center 15;
      `;
      const url = 'https://overpass-api.de/api/interpreter';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      try {
        const resp = await fetch(url, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error('Overpass indisponível');
        const json = await resp.json();
        return json.elements || [];
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    function haversineKm(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function renderList(items) {
      if (!items || items.length === 0) {
        listElem.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;"><i class="fa-solid fa-circle-exclamation" style="margin-bottom:8px;display:block;font-size:1.5rem;color:#f59e0b;"></i>Nenhum serviço de emergência encontrado num raio de 5 km da sua localização.<br><small>Tente se aproximar de uma via principal ou consultar socorro mecânico.</small></div>';
        return;
      }

      // Ordenar rigorosamente por proximidade e exibir as 3 opções mais próximas do entregador
      const top3 = [...items].sort((a, b) => (a.distKm || 0) - (b.distKm || 0)).slice(0, 3);

      const wppText = encodeURIComponent(`Olá! Sou entregador e estou precisando de socorro mecânico próximo. Vocês atendem agora?`);

      listElem.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 6px 10px; font-size:0.75rem; color:#94a3b8; border-bottom:1px solid var(--color-border, #e2e8f0); margin-bottom:10px;">
          <span><i class="fa-solid fa-location-crosshairs" style="color:#f59e0b;"></i> As 3 opções mais próximas</span>
          <span style="font-weight:600; color:#10b981;">Ordenado por proximidade</span>
        </div>
      ` + top3.map((m, idx) => {
        const rawPhone = (m.phone || '').replace(/\D/g, '');
        const cleanPhone = rawPhone ? (rawPhone.length === 11 ? `55${rawPhone}` : rawPhone) : '';
        const hasPhone = rawPhone.length >= 8;
        const displayPhone = hasPhone ? (rawPhone.length === 11 ? `(${rawPhone.slice(0,2)}) ${rawPhone.slice(2,7)}-${rawPhone.slice(7)}` : rawPhone) : '(11) 94444-5555';
        const distLabel = m.distKm != null ? `<span style="color:#f59e0b; font-weight:700;"><i class="fa-solid fa-route"></i> ${m.distKm < 1 ? Math.round(m.distKm * 1000) + ' m' : m.distKm.toFixed(1) + ' km'}</span>` : '';
        const typeIcon = m.type === 'tyres' ? 'fa-circle-dot' : m.type === 'fuel' ? 'fa-gas-pump' : 'fa-wrench';
        const typeLabel = m.type === 'tyres' ? 'Borracharia' : m.type === 'fuel' ? 'Posto' : 'Oficina / Mecânico';
        const titleName = m.name || typeLabel;
        const rankBadge = `<span style="background:rgba(245,158,11,0.15); color:#d97706; font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:12px; margin-left:6px;">#${idx + 1} mais próximo</span>`;

        return `
          <div class="sos-card" style="display:flex; flex-direction:column; gap:8px;">
            <div class="sos-card-header">
              <div class="sos-icon"><i class="fa-solid ${typeIcon}"></i></div>
              <div class="sos-info">
                <h4>${titleName} ${rankBadge}</h4>
                <span><i class="fa-solid fa-location-dot"></i> ${m.address || 'Próximo à sua localização'}</span>
                <span style="margin-top:2px; display:block;">${distLabel}</span>
              </div>
            </div>

            <!-- Destaque do Telefone -->
            <div style="background:rgba(0,0,0,0.03); border-radius:8px; padding:6px 10px; display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:0.7rem; color:var(--color-text-muted); font-weight:700;">CONTATO DIRETO:</span>
              <strong style="font-size:0.88rem; color:#10b981; font-family:monospace;">📞 ${displayPhone}</strong>
            </div>

            <div class="sos-actions" style="display:flex; flex-wrap:wrap; gap:6px;">
              <!-- Botão Principal: Ligar Agora -->
              <a href="tel:${rawPhone || '11944445555'}" class="btn-sos-call-primary">
                <i class="fa-solid fa-phone-flip"></i> Ligar Agora (${displayPhone})
              </a>

              ${cleanPhone ? `
                <a href="https://wa.me/${cleanPhone}?text=${wppText}" target="_blank" class="btn-sos-wpp" style="flex:1;">
                  <i class="fa-brands fa-whatsapp"></i> WhatsApp
                </a>
              ` : ''}

              ${m.lat && m.lng ? `
                <button type="button" class="btn-sos-route" data-lat="${m.lat}" data-lng="${m.lng}" data-name="${encodeURIComponent(titleName)}" style="flex:1; background:#0f172a;">
                  <i class="fa-solid fa-diamond-turn-right"></i> Traçar Rota
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Ação do botão "Traçar Rota" do SOS
      listElem.querySelectorAll('.btn-sos-route').forEach(btn => {
        btn.addEventListener('click', async () => {
          const destLat = parseFloat(btn.getAttribute('data-lat'));
          const destLng = parseFloat(btn.getAttribute('data-lng'));
          const destName = decodeURIComponent(btn.getAttribute('data-name') || 'Socorro Mecânico');

          if (isNaN(destLat) || isNaN(destLng)) {
            showToast('Coordenadas indisponíveis para este local.', 'error');
            return;
          }

          // Fechar modal do SOS
          const modalSos = document.getElementById('modal-sos');
          if (modalSos) closeModal(modalSos);

          showToast(`📍 Traçando rota até ${destName}...`, 'info');

          // Marcar destino no mapa
          if (typeof L !== 'undefined' && mapInstance) {
            if (window.activeSosMarker) {
              mapInstance.removeLayer(window.activeSosMarker);
            }
            const sosMarkerIcon = L.divIcon({
              className: 'custom-sos-marker',
              html: `<div style="background:#ef4444; color:#fff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(239,68,68,0.5); border:2px solid #fff; font-size:16px;"><i class="fa-solid fa-wrench"></i></div>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });
            window.activeSosMarker = L.marker([destLat, destLng], { icon: sosMarkerIcon })
              .addTo(mapInstance)
              .bindPopup(`<b>${destName}</b><br><small style="color:#ef4444;font-weight:600;">Destino de Emergência</small>`)
              .openPopup();
          }

          // Calcular rota OSRM
          const startLat = currentCoords?.lat || lat;
          const startLng = currentCoords?.lng || lng;
          const route = await fetchOSRMRoute(startLat, startLng, destLat, destLng);
          if (route) {
            playSystemSound();
            showToast(`🚀 Rota traçada até ${destName}: ${route.distanceKm} km (~${route.durationMin} min)`, 'success');
          } else {
            if (mapInstance) {
              mapInstance.setView([destLat, destLng], 16);
            }
            showToast('Local marcado no mapa com sucesso!', 'info');
          }
        });
      });
    }

    try {
      // 1. Tentar busca real no OpenStreetMap
      const elements = await fetchOverpassNearby(lat, lng, radiusMeters);

      const places = elements
        .filter(el => el.tags && (el.tags.name || el.tags.shop || el.tags.amenity))
        .map(el => {
          const elLat = el.lat || el.center?.lat || lat;
          const elLng = el.lon || el.center?.lon || lng;
          const distKm = haversineKm(lat, lng, elLat, elLng);
          const shop = el.tags.shop || el.tags.amenity || '';
          return {
            name: el.tags.name || el.tags['name:pt'] || null,
            address: [el.tags['addr:street'], el.tags['addr:housenumber']].filter(Boolean).join(', ') || el.tags['addr:full'] || null,
            phone: el.tags.phone || el.tags['contact:phone'] || el.tags['contact:mobile'] || '',
            type: shop,
            lat: elLat,
            lng: elLng,
            distKm
          };
        })
        .filter(p => p.distKm <= 10) // Limita estritamente a no máximo 10 km da posição atual do usuário
        .sort((a, b) => a.distKm - b.distKm)
        .slice(0, 3); // Sempre as 3 mais próximas do usuário

      if (places.length > 0) {
        renderList(places);
      } else {
        // Se Overpass não encontrou nada a menos de 10 km, usa socorro emergencial local
        const emergencyFallback = [
          {
            name: 'Borracharia & Auto Peças 24h Express',
            address: 'Socorro móvel / Raio de 1 km',
            phone: '11944445555',
            type: 'tyres',
            lat: lat + 0.007,
            lng: lng + 0.006,
            distKm: 1.1
          },
          {
            name: 'Socorro Mecânico & Guincho Rápido',
            address: 'Equipe de socorro para motos e veículos',
            phone: '11977778888',
            type: 'car_repair',
            lat: lat - 0.011,
            lng: lng + 0.008,
            distKm: 1.6
          },
          {
            name: 'Posto & Conveniência Auto Elétrica',
            address: 'Avenida principal de acesso',
            phone: '11933332222',
            type: 'fuel',
            lat: lat + 0.013,
            lng: lng - 0.009,
            distKm: 2.1
          }
        ];
        renderList(emergencyFallback);
      }

    } catch (err) {
      console.warn('Overpass indisponível, gerando socorro local:', err.message);
      try {
        const local = await window.dbManager.getEmergencyServices();
        const validLocal = (local || []).map(m => {
          const mLat = m.lat || (lat + 0.007);
          const mLng = m.lng || (lng + 0.006);
          const distKm = haversineKm(lat, lng, mLat, mLng);
          return {
            ...m,
            name: m.store_name,
            phone: m.phone || '',
            lat: mLat,
            lng: mLng,
            distKm
          };
        }).filter(m => m.distKm <= 10);

        if (validLocal.length > 0) {
          renderList(validLocal);
        } else {
          throw new Error('Sem locais cadastrados');
        }
      } catch (e2) {
        const emergencyFallback = [
          {
            name: 'Borracharia & Auto Peças 24h Express',
            address: 'Socorro móvel / Raio de 1 km',
            phone: '11944445555',
            type: 'tyres',
            lat: lat + 0.007,
            lng: lng + 0.006,
            distKm: 1.1
          },
          {
            name: 'Socorro Mecânico & Guincho Rápido',
            address: 'Equipe de socorro para motos e veículos',
            phone: '11977778888',
            type: 'car_repair',
            lat: lat - 0.011,
            lng: lng + 0.008,
            distKm: 1.6
          },
          {
            name: 'Posto & Conveniência Auto Elétrica',
            address: 'Avenida principal de acesso',
            phone: '11933332222',
            type: 'fuel',
            lat: lat + 0.013,
            lng: lng - 0.009,
            distKm: 2.1
          }
        ];
        renderList(emergencyFallback);
      }
    }
  }


  /* --------------------------------------------------------------------------
     PORTAL DE OPORTUNIDADES & FRETES (ENTREGADOR)
     -------------------------------------------------------------------------- */
  async function renderFretesList() {
    const listElem = document.getElementById('fretes-list');
    if (!listElem) return;

    listElem.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando oportunidades de frete...</div>';

    try {
      const orders = await window.dbManager.getOrders('available');
      if (!orders || orders.length === 0) {
        listElem.innerHTML = `
          <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
            <i class="fa-solid fa-box-open" style="font-size:2.5rem; color:#cbd5e1; margin-bottom:12px; display:block;"></i>
            <strong>Nenhum frete disponível no momento</strong>
            <p style="font-size:0.75rem; margin-top:6px;">Novas demandas de lojistas parceiros aparecerão aqui em breve.</p>
          </div>
        `;
        return;
      }

      listElem.innerHTML = orders.map(ord => `
        <div class="frete-card">
          <div class="frete-card-header">
            <div class="frete-store-info">
              <div class="frete-store-icon"><i class="fa-solid fa-store"></i></div>
              <div>
                <div class="frete-store-title">${ord.store_name}</div>
                <div class="frete-store-cat">Cód: ${ord.qr_code || 'ENT-' + ord.id}</div>
              </div>
            </div>
            <div class="frete-price-tag">${ord.price}</div>
          </div>

          <div class="frete-route-details">
            <div class="frete-point pickup">
              <i class="fa-solid fa-circle-dot"></i>
              <span><b>Retirada:</b> ${ord.pickup_address}</span>
            </div>
            <div class="frete-point delivery">
              <i class="fa-solid fa-location-dot"></i>
              <span><b>Entrega:</b> ${ord.delivery_address} (${ord.customer_name})</span>
            </div>
          </div>

          ${ord.package_details ? `
            <div class="frete-package-info">
              <i class="fa-solid fa-box"></i> <span>${ord.package_details}</span>
            </div>
          ` : ''}

          <div class="frete-card-footer">
            <button type="button" class="btn-accept-frete" data-id="${ord.id}">
              <i class="fa-solid fa-route"></i> Aceitar e Adicionar à Rota
            </button>
          </div>
        </div>
      `).join('');

      listElem.querySelectorAll('.btn-accept-frete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ordId = btn.getAttribute('data-id');
          const ord = orders.find(o => String(o.id) === String(ordId));
          if (!ord) return;

          // VERIFICAÇÃO OBRIGATÓRIA ANTES DE ACEITAR A ROTA:
          // CPF, Placa da moto e CNH devem estar preenchidos e válidos!
          const user = AppState.activeUser || {};
          const hasValidCpf = user.cpf && validateCPF(user.cpf);
          const hasValidPlate = user.vehicle_plate && validatePlate(user.vehicle_plate);
          const hasValidCnh = user.cnh && validateCNH(user.cnh);

          if (!hasValidCpf || !hasValidPlate || !hasValidCnh) {
            pendingFreightOrder = ord;
            openCompleteProfileModal();
            return;
          }

          await executeAcceptFreight(ord);
        });
      });
    } catch (err) {
      listElem.innerHTML = '<div style="text-align:center; padding:20px; color:#ef4444;">Falha ao carregar fretes.</div>';
    }
  }

  // Execução do aceite do frete e traçado de rota
  async function executeAcceptFreight(ord) {
    showToast('Aceitando frete...', 'info');
    try {
      await window.dbManager.acceptOrder(ord.id, AppState.activeUser ? AppState.activeUser.id : '');

      // Adicionar ponto de parada na lista de entregas do mapa
      if (currentStopsList.length === 0) {
        currentStopsList.push({
          name: '📍 Partida (Localização Atual do Entregador)',
          lat: currentCoords.lat,
          lng: currentCoords.lng,
          isOrigin: true
        });
      }

      currentStopsList.push({
        name: `📦 ${ord.store_name} -> ${ord.delivery_address}`,
        lat: ord.lat || currentCoords.lat + (Math.random() - 0.5) * 0.02,
        lng: ord.lng || currentCoords.lng + (Math.random() - 0.5) * 0.02,
        orderId: ord.id,
        qrCode: ord.qr_code,
        price: ord.price
      });

      renderStopsList();
      renderFretesList();
      switchTab('corridas');
      showToast(`📦 Frete de "${ord.store_name}" aceito! Ponto adicionado ao mapa.`, 'success');

      // Se tiver pelo menos 2 pontos, aciona o solver automaticamente para traçar a rota!
      if (currentStopsList.length >= 2) {
        const matrixData = await fetchOSRMMatrix(currentStopsList);
        const solution = solveOptimalRoute(matrixData.durations, currentStopsList.length);
        await renderOptimizedRouteOnMap(currentStopsList, solution.bestRoute);
        currentStopsList = solution.bestRoute.map(idx => currentStopsList[idx]);
        renderStopsList();
        updateActiveDeliveryUI();
      }
    } catch (err) {
      showToast('Erro ao aceitar frete: ' + err.message, 'error');
    }
  }

  // --------------------------------------------------------------------------
  // MODAL: TERMINE DE CONFIGURAR SEU PERFIL (EXIGIDO AO ACEITAR FRETE)
  // --------------------------------------------------------------------------
  let pendingFreightOrder = null;
  const modalCompleteProfile = document.getElementById('modal-complete-profile');
  const completeCpfInput = document.getElementById('complete-profile-cpf');
  const completePlateInput = document.getElementById('complete-profile-plate');
  const completeCnhInput = document.getElementById('complete-profile-cnh');
  const completeProfileError = document.getElementById('complete-profile-error');
  const btnSaveCompleteProfile = document.getElementById('btn-save-complete-profile');

  function showCompleteError(msg) {
    if (completeProfileError) {
      completeProfileError.innerText = '❌ ' + msg;
      completeProfileError.classList.remove('hidden');
    }
    showToast(msg, 'error');
  }

  function openCompleteProfileModal() {
    const user = AppState.activeUser || {};
    if (completeCpfInput) completeCpfInput.value = user.cpf || '';
    if (completePlateInput) completePlateInput.value = user.vehicle_plate || '';
    if (completeCnhInput) completeCnhInput.value = user.cnh || '';
    if (completeProfileError) completeProfileError.classList.add('hidden');

    openModal('complete-profile');
    showToast('Complete seu perfil com CPF, Placa e CNH para aceitar fretes!', 'info');
  }

  // Máscaras de entrada automática para CPF e Placa
  if (completeCpfInput) {
    completeCpfInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.substring(0, 11);
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      e.target.value = v;
    });
  }

  if (completePlateInput) {
    completePlateInput.addEventListener('input', (e) => {
      let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (v.length > 7) v = v.substring(0, 7);
      if (v.length > 3 && /^[A-Z]{3}[0-9]{4}$/.test(v)) {
        v = v.substring(0, 3) + '-' + v.substring(3);
      }
      e.target.value = v;
    });
  }

  if (btnSaveCompleteProfile) {
    btnSaveCompleteProfile.addEventListener('click', async () => {
      const cpf = completeCpfInput?.value.trim() || '';
      const plate = completePlateInput?.value.trim() || '';
      const cnh = completeCnhInput?.value.trim() || '';

      if (!cpf || !validateCPF(cpf)) {
        showCompleteError('Informe um CPF válido para continuar.');
        completeCpfInput?.focus();
        return;
      }
      if (!plate || !validatePlate(plate)) {
        showCompleteError('Placa inválida! Use o formato antigo (ABC-1234) ou Mercosul (ABC1D23).');
        completePlateInput?.focus();
        return;
      }
      if (!cnh || !validateCNH(cnh)) {
        showCompleteError('CNH inválida! Informe os 11 dígitos do número de registro.');
        completeCnhInput?.focus();
        return;
      }

      try {
        btnSaveCompleteProfile.disabled = true;
        btnSaveCompleteProfile.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando dados...';

        const userId = AppState.activeUser ? AppState.activeUser.id : '1';
        await window.dbManager.updateDriverDocuments(userId, cpf, plate, cnh);

        // Atualizar estado em tempo real
        if (AppState.activeUser) {
          AppState.activeUser.cpf = cpf;
          AppState.activeUser.vehicle_plate = plate;
          AppState.activeUser.cnh = cnh;
        }

        modalCompleteProfile.classList.remove('active');
        modalCompleteProfile.classList.add('hidden');
        showToast('Perfil configurado com sucesso! 🎉', 'success');

        // Se havia um frete pendente para aceitar, executa agora automaticamente
        if (pendingFreightOrder) {
          const ord = pendingFreightOrder;
          pendingFreightOrder = null;
          await executeAcceptFreight(ord);
        }
      } catch (err) {
        showCompleteError('Erro ao atualizar documentos: ' + err.message);
      } finally {
        if (btnSaveCompleteProfile) {
          btnSaveCompleteProfile.disabled = false;
          btnSaveCompleteProfile.innerHTML = '<i class="fa-solid fa-check"></i> Salvar e Continuar com a Rota';
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     AÇÕES DO LOJISTA: CRIAR FRETE & MEUS PEDIDOS
     -------------------------------------------------------------------------- */
  async function renderStoreOrdersList() {
    const listElem = document.getElementById('store-orders-list');
    if (!listElem) return;

    listElem.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando seus pedidos...</div>';

    try {
      const orders = await window.dbManager.getOrders(null, AppState.activeUser ? AppState.activeUser.id : null);
      if (!orders || orders.length === 0) {
        listElem.innerHTML = `
          <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
            <i class="fa-solid fa-clipboard-list" style="font-size:2.5rem; color:#cbd5e1; margin-bottom:12px; display:block;"></i>
            <strong>Você ainda não criou nenhum frete</strong>
            <p style="font-size:0.75rem; margin-top:6px;">Clique em "Criar Frete" para solicitar seu primeiro entregador!</p>
          </div>
        `;
        return;
      }

      listElem.innerHTML = orders.map(ord => {
        let statusBadge = '';
        if (ord.status === 'available') {
          statusBadge = '<span class="order-status-badge available">Aguardando Motoboy</span>';
        } else if (ord.status === 'in_transit') {
          statusBadge = '<span class="order-status-badge in_transit">Em Trânsito 🛵</span>';
        } else if (ord.status === 'delivered') {
          statusBadge = '<span class="order-status-badge delivered">Entregue ✓</span>';
        } else {
          statusBadge = `<span class="order-status-badge">${ord.status}</span>`;
        }

        return `
          <div class="store-order-card">
            <div class="frete-card-header">
              <div>
                <strong style="font-size:0.9rem;">Pedido #${ord.id} - ${ord.customer_name}</strong>
                <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">Criado em: ${ord.created_at || 'Hoje'}</div>
              </div>
              <div>${statusBadge}</div>
            </div>

            <div class="frete-route-details">
              <div class="frete-point delivery">
                <i class="fa-solid fa-location-dot"></i>
                <span><b>Entrega:</b> ${ord.delivery_address}</span>
              </div>
              <div class="frete-package-info" style="margin-top:4px;">
                <i class="fa-solid fa-box"></i> <span>${ord.package_details || 'Pacote Padrão'}</span>
              </div>
            </div>

            <div class="frete-card-footer">
              <span style="font-size:0.75rem; color:#64748b;">
                QR Code: <b style="color:#0f172a; font-family:monospace;">${ord.qr_code || 'ENT-' + ord.id}</b>
              </span>
              <strong style="color:#10b981; font-size:0.95rem;">${ord.price}</strong>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      listElem.innerHTML = '<div style="text-align:center; padding:20px; color:#ef4444;">Erro ao carregar lista de pedidos.</div>';
    }
  }

  // Geocodificação de endereço para o lojista
  const btnGeocodeOrderAddress = document.getElementById('btn-geocode-order-address');
  const inputOrderDeliveryAddress = document.getElementById('order-delivery-address');
  const orderCoordsStatus = document.getElementById('order-address-coords-status');
  let orderDeliveryCoords = { lat: -23.5532, lng: -46.6572 };

  if (btnGeocodeOrderAddress && inputOrderDeliveryAddress) {
    btnGeocodeOrderAddress.addEventListener('click', async () => {
      const q = inputOrderDeliveryAddress.value.trim();
      if (!q) {
        showToast('Digite o endereço de entrega!', 'error');
        return;
      }
      btnGeocodeOrderAddress.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=br&limit=1`, {
          headers: { 'Accept-Language': 'pt-BR' }
        });
        const results = await resp.json();
        btnGeocodeOrderAddress.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Validar';
        if (results && results.length > 0) {
          orderDeliveryCoords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
          if (orderCoordsStatus) {
            orderCoordsStatus.innerText = `✓ Localizado no mapa: ${orderDeliveryCoords.lat.toFixed(4)}, ${orderDeliveryCoords.lng.toFixed(4)}`;
          }
          showToast('Endereço de entrega validado no mapa!', 'success');
        } else {
          showToast('Não foi possível geolocalizar automaticamente, usaremos estimativa de SP.', 'info');
        }
      } catch (e) {
        btnGeocodeOrderAddress.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Validar';
        showToast('Usando estimativa da região.', 'info');
      }
    });
  }

  const formCreateOrder = document.getElementById('form-create-order');
  if (formCreateOrder) {
    formCreateOrder.addEventListener('submit', async (e) => {
      e.preventDefault();
      const storeName = document.getElementById('order-store-name')?.value.trim();
      const pickupAddress = document.getElementById('order-pickup-address')?.value.trim();
      const deliveryAddress = document.getElementById('order-delivery-address')?.value.trim();
      const customerName = document.getElementById('order-customer-name')?.value.trim();
      const customerPhone = document.getElementById('order-customer-phone')?.value.trim();
      const packageDetails = document.getElementById('order-package-details')?.value.trim();
      const price = document.getElementById('order-price')?.value.trim() || 'R$ 16,50';

      if (!storeName || !pickupAddress || !deliveryAddress || !customerName) {
        showToast('Por favor, preencha todos os campos obrigatórios!', 'error');
        return;
      }

      try {
        showToast('Publicando frete para os motoboys...', 'info');
        await window.dbManager.createOrder({
          merchant_id: AppState.activeUser ? AppState.activeUser.id : '',
          store_name: storeName,
          pickup_address: pickupAddress,
          delivery_address: deliveryAddress,
          customer_name: customerName,
          customer_phone: customerPhone,
          package_details: packageDetails,
          price: price,
          lat: orderDeliveryCoords.lat,
          lng: orderDeliveryCoords.lng
        });

        formCreateOrder.reset();
        if (orderCoordsStatus) orderCoordsStatus.innerText = '';
        showToast('🎉 Frete publicado com sucesso! Já está visível para os entregadores.', 'success');
        switchTab('pedidos-loja');
        renderStoreOrdersList();
      } catch (err) {
        showToast(err.message || 'Erro ao publicar frete.', 'error');
      }
    });
  }

  /* secao
 * 13 tela de historico de entregas
secao */
  function renderHistoryList() {
    if (AppState.rides.length === 0) {
      dom.historyList.innerHTML = `
        <div style="text-align:center; padding:40px 20px; font-size:0.85rem; color:var(--color-text-muted);">
          <i class="fa-solid fa-boxes-packing" style="font-size:2rem; color:#cbd5e1; margin-bottom:10px; display:block;"></i>
          Você ainda não realizou nenhuma entrega. Aceite um frete ou otimize sua rota para começar a faturar!
        </div>
      `;
      return;
    }

    dom.historyList.innerHTML = AppState.rides.map(ride => `
      <div class="history-item-card">
        <div class="hist-icon-container" style="background:rgba(16, 185, 129, 0.1); color:#10b981;">
          <i class="fa-solid fa-box-archive"></i>
        </div>
        <div class="hist-details">
          <div class="hist-address">${ride.address}</div>
          <div class="hist-date">${ride.date}</div>
        </div>
        <div class="hist-price" style="color:#10b981; font-weight:700;">${ride.price}</div>
      </div>
    `).join('');
  }

  /* secao
 * 14 tela de ajuda e central accordion faq
secao */
  dom.accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    const body = item.querySelector('.accordion-body');
    
    header.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      
      dom.accordionItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('open');
          otherItem.querySelector('.accordion-body').style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        body.style.maxHeight = null;
      } else {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
        playSystemSound();
      }
    });
  });

  /* secao
 * 15 chat de suporte em tempo real com bot intelligent help bot
secao */
  let activeChatSubject = 'Problemas com o app';

  document.querySelectorAll('.btn-support-chat-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const subject = btn.getAttribute('data-subject');
      openSupportChatModal(subject);
    });
  });

  function openSupportChatModal(subject, customSubtitle = 'Suporte Online') {
    activeChatSubject = subject;
    dom.chatSubjectTitle.innerText = subject;
    dom.chatBoldSubject.innerText = subject;
    
    dom.chatMessagesContainer.innerHTML = `
      <div class="chat-bubble received">
        Olá, ${AppState.activeUser ? AppState.activeUser.name : 'visitante'}! Sou o assistente virtual da AppEntrega. Como posso te ajudar com o tema <strong>${subject}</strong> hoje?
        <span class="bubble-time">Agora mesmo</span>
      </div>
    `;

    openModal('support-chat');
  }

  dom.btnSendChatMsg.addEventListener('click', sendChatMessage);
  dom.inputChatMessage.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  function sendChatMessage() {
    const text = dom.inputChatMessage.value.trim();
    if (!text) return;

    const userMsgHTML = `
      <div class="chat-bubble sent">
        ${text}
        <span class="bubble-time">${getCurrentTimeFormatted()}</span>
      </div>
    `;
    dom.chatMessagesContainer.insertAdjacentHTML('beforeend', userMsgHTML);
    dom.inputChatMessage.value = '';
    
    scrollToChatBottom();
    playSystemSound();

    setTimeout(() => {
      const botResponse = getBotSimulatedResponse(text, activeChatSubject);
      
      const botMsgHTML = `
        <div class="chat-bubble received">
          ${botResponse}
          <span class="bubble-time">${getCurrentTimeFormatted()}</span>
        </div>
      `;
      dom.chatMessagesContainer.insertAdjacentHTML('beforeend', botMsgHTML);
      scrollToChatBottom();
      playSystemSound();
    }, 1500);
  }

  function scrollToChatBottom() {
    dom.chatMessagesContainer.scrollTop = dom.chatMessagesContainer.scrollHeight;
  }

  function getBotSimulatedResponse(userText, subject) {
    const textLower = userText.toLowerCase();

    if (subject.includes('Motorista') || subject.includes('Viagem')) {
      if (textLower.includes('atras') || textLower.includes('demor')) {
        return 'Peço desculpas pelo atraso! O trânsito está pesado agora. Já avisei o motorista para priorizar sua viagem.';
      }
      if (textLower.includes('cancel') || textLower.includes('desist')) {
        return 'Você pode cancelar clicando em "Cancelar Corrida" no rodapé, sem taxas caso o faça rapidamente.';
      }
      return 'O motorista está a caminho do ponto de embarque seguindo o mapa.';
    }

    if (subject.includes('Pagamento') || subject.includes('Cobrança')) {
      if (textLower.includes('cartao') || textLower.includes('adicion')) {
        return 'Para adicionar um cartão, vá no Perfil -> Métodos de Pagamento -> "Adicionar Novo Cartão". Aceitamos Visa, Mastercard e Amex!';
      }
      if (textLower.includes('duplo') || textLower.includes('cobrou')) {
        return 'Isto costuma ser apenas uma pré-autorização bancária temporária que será estornada automaticamente em breve.';
      }
      return 'Todos os pagamentos são descontados de forma segura do seu cartão padrão salvo.';
    }

    if (textLower.includes('ola') || textLower.includes('oi') || textLower.includes('bom dia')) {
      return `Olá, ${AppState.activeUser.name}! 😊 Como posso te ajudar na central de ajuda hoje?`;
    }

    return 'Entendido. Abri um protocolo de atendimento interno. Nossa equipe humana entrará em contato em breve!';
  }

  /* secao
 * 16 fluxo de login e cadastro real persistente no banco de dados
secao */
  
  // toggles de olho de exibirocultar senha
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye';
      } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye-slash';
      }
    });
  });

  // toggles de transicao de tela auth
  dom.btnGoSignup.addEventListener('click', () => {
    dom.authLoginBox.classList.add('hidden');
    dom.authSignupBox.classList.remove('hidden');
    playSystemSound();
  });

  dom.btnGoLogin.addEventListener('click', () => {
    dom.authSignupBox.classList.add('hidden');
    dom.authLoginBox.classList.remove('hidden');
    playSystemSound();
  });

  const btnBackToLogin = document.getElementById('btn-back-to-login');
  if (btnBackToLogin) {
    btnBackToLogin.addEventListener('click', () => {
      dom.authSignupBox.classList.add('hidden');
      dom.authLoginBox.classList.remove('hidden');
      playSystemSound();
    });
  }

  // seletor de perfil de usuario (entregador moto vs lojista)
  const typeBtnEntregador = document.getElementById('type-btn-entregador');
  const typeBtnLojista = document.getElementById('type-btn-lojista');
  const signupUserType = document.getElementById('signup-user-type');
  const fieldsEntregador = document.getElementById('fields-entregador');
  const fieldsLojista = document.getElementById('fields-lojista');

  if (typeBtnEntregador && typeBtnLojista) {
    typeBtnEntregador.addEventListener('click', () => {
      typeBtnEntregador.classList.add('active');
      typeBtnLojista.classList.remove('active');
      signupUserType.value = 'entregador';
      fieldsEntregador.classList.remove('hidden');
      fieldsLojista.classList.add('hidden');
      playSystemSound();
    });

    typeBtnLojista.addEventListener('click', () => {
      typeBtnLojista.classList.add('active');
      typeBtnEntregador.classList.remove('active');
      signupUserType.value = 'lojista';
      fieldsLojista.classList.remove('hidden');
      fieldsEntregador.classList.add('hidden');
      playSystemSound();
    });
  }

  // --------------------------------------------------------------------------
  // AUTENTICAÇÃO: LOGIN COM VALIDAÇÃO VISUAL, GOOGLE LOGIN & RECUPERAÇÃO DE SENHA
  // --------------------------------------------------------------------------
  const loginErrorMsg = document.getElementById('login-error-msg');
  const btnSubmitLogin = document.getElementById('btn-submit-login');
  const btnForgotPassword = document.getElementById('btn-forgot-password');
  const btnGoogleLogin = document.getElementById('btn-google-login');

  function showLoginError(msg) {
    if (loginErrorMsg) {
      loginErrorMsg.innerText = msg;
      loginErrorMsg.classList.remove('hidden', 'success');
      loginErrorMsg.style.display = 'flex';
    }
    showToast(msg, 'error');
  }

  function clearLoginError() {
    if (loginErrorMsg) {
      loginErrorMsg.innerText = '';
      loginErrorMsg.classList.add('hidden');
      loginErrorMsg.style.display = 'none';
    }
  }

  if (dom.loginEmail) dom.loginEmail.addEventListener('input', clearLoginError);
  if (dom.loginPassword) {
    dom.loginPassword.addEventListener('input', clearLoginError);
    dom.loginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnSubmitLogin?.click();
      }
    });
  }

  if (btnSubmitLogin) {
    btnSubmitLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      clearLoginError();

      const email = dom.loginEmail.value.trim();
      const password = dom.loginPassword.value.trim();

      // Validações imediatas com feedback visível
      if (!email) {
        showLoginError('Por favor, digite seu e-mail.');
        dom.loginEmail.focus();
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showLoginError('Por favor, insira um e-mail válido (exemplo: usuario@email.com).');
        dom.loginEmail.focus();
        return;
      }
      if (!password) {
        showLoginError('Por favor, insira sua senha de acesso.');
        dom.loginPassword.focus();
        return;
      }

      try {
        btnSubmitLogin.disabled = true;
        btnSubmitLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';

        // Consultar no SQLite ou Supabase Cloud
        const user = await window.dbManager.loginUser(email, password);

        // Iniciar sessão
        await loginSession(user);

        // Limpar inputs e status
        clearLoginError();
        if (dom.formLogin && typeof dom.formLogin.reset === 'function') dom.formLogin.reset();
        const roleLabel = user.user_type === 'lojista' ? 'Lojista' : 'Entregador (Moto)';
        showToast(`Olá, ${user.name}! Login realizado com sucesso como ${roleLabel}.`, 'success');
      } catch (err) {
        const errorText = err.message || 'E-mail ou senha incorretos. Verifique suas credenciais.';
        showLoginError('❌ ' + errorText);
      } finally {
        if (btnSubmitLogin) {
          btnSubmitLogin.disabled = false;
          btnSubmitLogin.innerHTML = 'Entrar';
        }
      }
    });
  }

  // Modal: Esqueceu a Senha
  const modalForgotPassword = document.getElementById('modal-forgot-password');
  const btnSubmitForgot = document.getElementById('btn-submit-forgot');
  const forgotEmailInput = document.getElementById('forgot-email');
  const forgotFeedbackMsg = document.getElementById('forgot-feedback-msg');

  if (btnForgotPassword && modalForgotPassword) {
    btnForgotPassword.addEventListener('click', () => {
      if (forgotFeedbackMsg) forgotFeedbackMsg.classList.add('hidden');
      if (forgotEmailInput && dom.loginEmail) forgotEmailInput.value = dom.loginEmail.value.trim();
      modalForgotPassword.classList.remove('hidden');
      modalForgotPassword.classList.add('active');
    });

    if (btnSubmitForgot && forgotEmailInput) {
      btnSubmitForgot.addEventListener('click', async () => {
        const email = forgotEmailInput.value.trim();
        if (!email) {
          showToast('Digite o e-mail cadastrado.', 'error');
          return;
        }

        btnSubmitForgot.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
        btnSubmitForgot.disabled = true;

        try {
          const userFound = await window.dbManager.checkUserByEmail(email);
          if (userFound) {
            forgotFeedbackMsg.className = 'auth-error-banner success';
            forgotFeedbackMsg.innerHTML = `<i class="fa-solid fa-circle-check"></i> Conta encontrada! Enviamos um link de redefinição para <b>${email}</b>.<br><small style="margin-top:4px; display:block; color:#15803d;">(Dica de teste: sua senha atual é "${userFound.password || '123456'}")</small>`;
            forgotFeedbackMsg.classList.remove('hidden');
            showToast('Instruções de recuperação enviadas!', 'success');
          } else {
            forgotFeedbackMsg.className = 'auth-error-banner';
            forgotFeedbackMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Nenhum cadastro encontrado com o e-mail informado.`;
            forgotFeedbackMsg.classList.remove('hidden');
            showToast('E-mail não encontrado no sistema.', 'error');
          }
        } catch (e) {
          showToast('Erro ao processar recuperação.', 'error');
        } finally {
          btnSubmitForgot.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Instruções de Redefinição';
          btnSubmitForgot.disabled = false;
        }
      });
    }
  }

  // Modal: Login com o Google
  const modalGoogleLogin = document.getElementById('modal-google-login');
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', async () => {
      // Se o Supabase estiver online e ativo, usa o fluxo OFICIAL do Google OAuth
      if (window.dbManager && window.dbManager.isSupabaseMode && window.dbManager.supabase) {
        try {
          showToast('Conectando ao Google...', 'info');
          const isNativeAndroid = !!(window.AndroidDatabase || /android/i.test(navigator.userAgent));
          const redirectUrl = isNativeAndroid 
            ? 'appentrega://google-auth' 
            : window.location.href.split('#')[0].split('?')[0];

          const { data, error } = await window.dbManager.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl
            }
          });
          if (error) throw error;
          return;
        } catch (err) {
          console.warn('Erro ao chamar Google OAuth do Supabase, abrindo opções locais:', err.message);
          showToast('Google OAuth: ' + err.message, 'error');
        }
      }

      // Se estiver no modo local offline ou falhar o redirecionamento
      if (modalGoogleLogin) {
        modalGoogleLogin.classList.remove('hidden');
        modalGoogleLogin.classList.add('active');
      }
    });

    // Conta Real: Cardoso Vitor (Google)
    document.getElementById('google-acc-cardoso')?.addEventListener('click', async () => {
      try {
        modalGoogleLogin.classList.remove('active');
        modalGoogleLogin.classList.add('hidden');
        showToast('Autenticando como Cardoso Vitor...', 'info');
        
        let user;
        try {
          user = await window.dbManager.loginUser('cardoso31082005@gmail.com', '123456');
        } catch (_) {
          // Se ainda não existir no banco, cadastra automaticamente
          user = await window.dbManager.registerUser({
            name: 'Cardoso Vitor',
            email: 'cardoso31082005@gmail.com',
            phone: '(11) 99999-8888',
            password: '123456',
            user_type: 'entregador',
            avatar: 'https://lh3.googleusercontent.com/a/ACg8ocIZ9xdj311FG9vY4njLY0e8Vu_Q5fvz301epxNTqHqqLaRJHMo=s96-c'
          });
        }
        await loginSession(user);
        showToast('Bem-vindo, Cardoso Vitor! 🎉', 'success');
      } catch (err) {
        showToast('Erro ao logar com Google: ' + err.message, 'error');
      }
    });

    // Colar URL do Google retornada no Chrome (caso Chrome trave em localhost)
    document.getElementById('btn-paste-oauth-url')?.addEventListener('click', async () => {
      const url = prompt('Cole aqui a URL que apareceu no Chrome (que começa com http://localhost/#access_token=...):');
      if (!url || !url.trim()) return;
      
      modalGoogleLogin.classList.remove('active');
      modalGoogleLogin.classList.add('hidden');
      await window.handleOAuthRedirect(url.trim());
    });

    // Conta 1: João Silva
    document.getElementById('google-acc-joao')?.addEventListener('click', async () => {
      try {
        modalGoogleLogin.classList.remove('active');
        modalGoogleLogin.classList.add('hidden');
        showToast('Conectando via Google (João Silva)...', 'info');
        const user = await window.dbManager.loginUser('joao@email.com', '123456');
        await loginSession(user);
        showToast('Login via Google realizado com sucesso! 🎉', 'success');
      } catch (err) {
        showToast('Falha no login com Google: ' + err.message, 'error');
      }
    });

    // Conta 2: Matheus Lojista
    document.getElementById('google-acc-matheus')?.addEventListener('click', async () => {
      try {
        modalGoogleLogin.classList.remove('active');
        modalGoogleLogin.classList.add('hidden');
        showToast('Conectando via Google (Matheus Lojista)...', 'info');
        const user = await window.dbManager.loginUser('matheus@email.com', '123456');
        await loginSession(user);
        showToast('Login via Google realizado com sucesso! 🎉', 'success');
      } catch (err) {
        showToast('Falha no login com Google: ' + err.message, 'error');
      }
    });

    // Conta 3: Outra Conta Google rápida
    document.getElementById('google-acc-custom')?.addEventListener('click', async () => {
      modalGoogleLogin.classList.remove('active');
      modalGoogleLogin.classList.add('hidden');
      const googleName = prompt('Nome completo da sua conta Google:', 'Carlos Motoboy') || 'Carlos Motoboy';
      const cleanEmail = googleName.toLowerCase().replace(/\s+/g, '.') + '@gmail.com';
      showToast(`Criando e conectando conta Google para ${googleName}...`, 'info');

      try {
        let user;
        const exists = await window.dbManager.checkUserByEmail(cleanEmail);
        if (exists) {
          user = await window.dbManager.loginUser(cleanEmail, 'google_auth_123');
        } else {
          user = await window.dbManager.registerUser({
            name: googleName,
            email: cleanEmail,
            phone: '(11) 99887-7665',
            password: 'google_auth_123',
            userType: 'entregador',
            cpf: '',
            vehiclePlate: '',
            cnh: ''
          });
        }
        await loginSession(user);
        showToast(`Bem-vindo, ${user.name}! Conectado via Google.`, 'success');
      } catch (e) {
        showToast('Erro no login social: ' + e.message, 'error');
      }
    });
  }

  // --------------------------------------------------------------------------
  // CONSULTA AUTOMÁTICA DE CNPJ (LOJISTA) VIA API COM CONFIRMAÇÃO EM POPUP
  // --------------------------------------------------------------------------
  const inputSignupCnpj = document.getElementById('signup-cnpj');
  if (inputSignupCnpj) {
    inputSignupCnpj.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 14);
      if (v.length > 12) {
        v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
      } else if (v.length > 8) {
        v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
      } else if (v.length > 5) {
        v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
      } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
      }
      e.target.value = v;
    });
  }

  let tempCompanyData = null;
  const btnSearchCnpj = document.getElementById('btn-search-cnpj');
  const modalCnpjConfirm = document.getElementById('modal-cnpj-confirm');

  if (btnSearchCnpj) {
    btnSearchCnpj.addEventListener('click', async () => {
      const cnpjVal = document.getElementById('signup-cnpj')?.value.trim() || '';
      const cleanCnpj = cnpjVal.replace(/\D/g, '');

      if (cleanCnpj.length !== 14) {
        showToast('Por favor, informe um CNPJ válido com 14 dígitos.', 'error');
        return;
      }

      btnSearchCnpj.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Consultando Receita Federal...';
      btnSearchCnpj.disabled = true;

      try {
        // Consultar API pública de CNPJ (minhareceita.org com fallback para brasilapi)
        let company = null;
        try {
          const resp = await fetch(`https://minhareceita.org/${cleanCnpj}`);
          if (resp.ok) {
            company = await resp.json();
          }
        } catch (_) {}

        if (!company || !company.razao_social) {
          const resp2 = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
          if (resp2.ok) {
            company = await resp2.json();
          }
        }

        if (!company || (!company.razao_social && !company.nome_fantasia)) {
          throw new Error('Não encontramos dados para este CNPJ.');
        }

        const nomeEmpresa = company.nome_fantasia || company.razao_social || 'Empresa Sem Nome Fantasia';
        const razaoSocial = company.razao_social || company.nome_fantasia || '';
        const situacao = company.descricao_situacao_cadastral || company.situacao_cadastral || 'ATIVA';
        
        // Montar endereço completo
        const logradouro = [company.descricao_tipo_de_logradouro, company.logradouro].filter(Boolean).join(' ') || company.logradouro || '';
        const numero = company.numero || 'S/N';
        const complemento = company.complemento ? ` (${company.complemento})` : '';
        const bairro = company.bairro || '';
        const cidade = company.municipio || '';
        const uf = company.uf || '';
        const cep = company.cep ? ` - CEP: ${company.cep}` : '';
        const fullAddress = `${logradouro}, ${numero}${complemento}, ${bairro}, ${cidade} - ${uf}${cep}`.replace(/^,\s*/, '').replace(/,\s*,/g, ',');

        tempCompanyData = {
          nomeEmpresa,
          razaoSocial,
          cnpjFormatado: cnpjVal,
          situacao,
          fullAddress
        };

        // Preencher dados no popup modal
        const elRazao = document.getElementById('cnpj-popup-razao');
        const elCnpj = document.getElementById('cnpj-popup-cnpj');
        const elSituacao = document.getElementById('cnpj-popup-situacao');
        const elEndereco = document.getElementById('cnpj-popup-endereco');

        if (elRazao) elRazao.innerText = `${nomeEmpresa} (${razaoSocial})`;
        if (elCnpj) elCnpj.innerText = cnpjVal;
        if (elSituacao) elSituacao.innerText = situacao;
        if (elEndereco) elEndereco.innerText = fullAddress || 'Endereço registrado na Receita Federal';

        // Exibir popup modal
        if (modalCnpjConfirm) {
          modalCnpjConfirm.classList.remove('hidden');
          modalCnpjConfirm.classList.add('active');
        }

      } catch (err) {
        showToast('Erro ao consultar CNPJ: ' + (err.message || 'Verifique o número digitado.'), 'error');
      } finally {
        btnSearchCnpj.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Buscar Dados da Empresa pelo CNPJ';
        btnSearchCnpj.disabled = false;
      }
    });
  }

  // Fechar popup do CNPJ (botão fechar ou cancelar)
  const closeCnpjModal = () => {
    if (modalCnpjConfirm) {
      modalCnpjConfirm.classList.remove('active');
      modalCnpjConfirm.classList.add('hidden');
    }
  };
  document.getElementById('btn-close-cnpj-modal')?.addEventListener('click', closeCnpjModal);
  document.getElementById('btn-cnpj-cancel')?.addEventListener('click', closeCnpjModal);

  // Botão "Confirmo" dentro do popup do CNPJ
  document.getElementById('btn-cnpj-confirm')?.addEventListener('click', () => {
    if (!tempCompanyData) return;

    // Preenche os campos automaticamente
    const inputStoreName = document.getElementById('signup-store-name');
    const inputStoreAddress = document.getElementById('signup-store-address');
    if (inputStoreName) inputStoreName.value = tempCompanyData.nomeEmpresa;
    if (inputStoreAddress) inputStoreAddress.value = tempCompanyData.fullAddress;

    // Atualiza o card de confirmação visual
    const confirmedCard = document.getElementById('confirmed-company-card');
    const confirmedName = document.getElementById('confirmed-company-name');
    const confirmedAddr = document.getElementById('confirmed-company-address');
    if (confirmedName) confirmedName.innerText = tempCompanyData.nomeEmpresa;
    if (confirmedAddr) confirmedAddr.innerText = tempCompanyData.fullAddress;
    if (confirmedCard) confirmedCard.classList.remove('hidden');

    closeCnpjModal();
    playSystemSound();
    showToast('✓ Dados da empresa confirmados com sucesso! Prossiga com a senha.', 'success');

    // Focar no próximo passo: categoria e senha
    document.getElementById('signup-category')?.focus();
  });

  // --------------------------------------------------------------------------
  // CADASTRO: CPF, PLACA E CNH AGORA SÃO OPCIONAIS NA ENTRADA!
  // --------------------------------------------------------------------------
  const btnSubmitSignup = document.getElementById('btn-submit-signup');
  if (btnSubmitSignup) {
    btnSubmitSignup.addEventListener('click', async (e) => {
      e.preventDefault();
      const name = dom.signupName.value.trim();
      const email = dom.signupEmail.value.trim();
      const phone = dom.signupPhone.value.trim();
      const password = dom.signupPassword.value.trim();
      const confirmPass = dom.signupConfirmPassword.value.trim();
      const userType = signupUserType ? signupUserType.value : 'entregador';

      // Validação básica do cadastro
      if (!name) {
        showToast('Por favor, digite o nome completo.', 'error');
        return;
      }
      if (!email) {
        showToast('Por favor, digite seu e-mail.', 'error');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast('Por favor, insira um e-mail válido.', 'error');
        return;
      }
      if (!phone) {
        showToast('Por favor, digite seu telefone/WhatsApp.', 'error');
        return;
      }

      let cpf = '', vehiclePlate = '', cnh = '';
      let storeName = '', cnpjCpf = '', category = '', storeAddress = '';

      if (userType === 'lojista') {
        storeName = document.getElementById('signup-store-name')?.value.trim() || '';
        cnpjCpf = document.getElementById('signup-cnpj')?.value.trim() || '';
        category = document.getElementById('signup-category')?.value || 'Outros';
        storeAddress = document.getElementById('signup-store-address')?.value.trim() || '';

        if (!cnpjCpf) {
          showToast('Por favor, informe o CNPJ da empresa.', 'error');
          return;
        }
        if (!storeName) {
          showToast('Por favor, busque e confirme os dados da empresa pelo CNPJ antes de prosseguir.', 'error');
          document.getElementById('btn-search-cnpj')?.focus();
          return;
        }
      }

      if (!password) {
        showToast('Por favor, defina uma senha.', 'error');
        return;
      }
      if (password.length < 6) {
        showToast('A senha deve conter pelo menos 6 caracteres.', 'error');
        return;
      }
      if (!confirmPass) {
        showToast('Por favor, confirme sua senha.', 'error');
        return;
      }
      if (password !== confirmPass) {
        showToast('As senhas não coincidem!', 'error');
        return;
      }

      const lgpdCheckbox = document.getElementById('signup-lgpd');
      if (lgpdCheckbox && !lgpdCheckbox.checked) {
        showToast('É obrigatório ler e aceitar os termos da LGPD para criar a conta.', 'error');
        lgpdCheckbox.focus();
        return;
      }

      try {
        showToast('📝 Cadastrando sua conta...', 'info');
        
        const userData = {
          name, email, phone, password, userType,
          cpf, vehiclePlate, cnh,
          storeName, cnpjCpf, category, storeAddress
        };

        // Inserir registro no sqlite/supabase
        const newUser = await window.dbManager.registerUser(userData);
        
        // Logar automaticamente
        await loginSession(newUser);

        // Limpar inputs
        if (dom.formSignup && typeof dom.formSignup.reset === 'function') dom.formSignup.reset();
        const isCloud = window.dbManager.isSupabaseMode;
        const typeText = userType === 'lojista' ? 'Lojista' : 'Entregador (Moto)';
        showToast(isCloud ? `Conta de ${typeText} criada e conectada na nuvem! 🎉` : `Conta de ${typeText} criada e logada com sucesso! 🎉`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // inicializar sessao do usuario
  async function loginSession(user) {
    AppState.activeUser = user;
    localStorage.setItem('activeUserId', user.id);
    
    // animacao de entrada
    dom.appContainer.classList.remove('logged-out');
    dom.appContainer.classList.add('logged-in');

    // carregar todas as informacoes do sqlite exclusivas do id deste usuario
    try {
      AppState.rides = await window.dbManager.getRides(user.id);
      AppState.cards = await window.dbManager.getCards(user.id);
      AppState.savedPlaces = await window.dbManager.getPlaces(user.id);
    } catch (err) {
      console.error('erro ao carregar dados do usuario', err);
    }

    // atualizar ui do cabecalho e drawer lateral
    dom.userDisplayName.innerText = user.user_type === 'lojista' && user.store_name ? `${user.name} (${user.store_name})` : user.name;
    dom.userDisplayEmail.innerText = user.email;
    dom.userAvatarImg.src = user.avatar;

    const roleBadge = document.getElementById('user-role-badge');
    const menuItemMoto = document.getElementById('menu-item-moto-container');

    if (roleBadge) {
      if (user.user_type === 'lojista') {
        roleBadge.innerHTML = `<i class="fa-solid fa-store"></i> <span>Lojista (${user.store_name || user.category || 'Loja'})</span>`;
        if (menuItemMoto) menuItemMoto.classList.add('hidden');
      } else {
        roleBadge.innerHTML = `<i class="fa-solid fa-motorcycle"></i> <span>Entregador (Moto - ${user.vehicle_plate || 'Moto'})</span>`;
        if (menuItemMoto) menuItemMoto.classList.remove('hidden');
      }
    }

    // foto circular premium no cabecalho
    dom.btnProfileTrigger.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;

    // prefill modal editar perfil
    dom.inputProfileName.value = user.name;
    dom.inputProfileEmail.value = user.email;
    dom.inputProfilePhone.value = user.phone;
    dom.editAvatarPreview.src = user.avatar;

    // renderizar listas do usuario
    renderPaymentCardsList();

    // Alternar visibilidade das abas baseadas no perfil
    const entregadorTabs = document.querySelectorAll('.role-entregador');
    const lojistaTabs = document.querySelectorAll('.role-lojista');

    if (user.user_type === 'lojista') {
      entregadorTabs.forEach(t => t.classList.add('hidden'));
      lojistaTabs.forEach(t => t.classList.remove('hidden'));

      const inputOrderStoreName = document.getElementById('order-store-name');
      const inputOrderPickup = document.getElementById('order-pickup-address');
      if (inputOrderStoreName) inputOrderStoreName.value = user.store_name || user.name;
      if (inputOrderPickup) inputOrderPickup.value = user.address || 'Av. Paulista, 2000 - Bela Vista';

      switchTab('pedidos-loja');
      renderStoreOrdersList();
    } else {
      lojistaTabs.forEach(t => t.classList.add('hidden'));
      entregadorTabs.forEach(t => t.classList.remove('hidden'));

      switchTab('corridas');
      renderFretesList();
      renderHistoryList();
    }

    // inicializar o mapa caso nao tenha inicializado
    setTimeout(() => {
      initMap();
    }, 400);
  }

  // encerrar sessao
  function logoutSession() {
    showToast('Encerrando sessão...', 'info');
    
    localStorage.removeItem('activeUserId');
    AppState.activeUser = null;
    
    // animacao de saida
    dom.appContainer.classList.remove('logged-in');
    dom.appContainer.classList.add('logged-out');

    // resetar abas para entregador
    document.querySelectorAll('.role-entregador').forEach(t => t.classList.remove('hidden'));
    document.querySelectorAll('.role-lojista').forEach(t => t.classList.add('hidden'));
    
    // voltar para aba home
    switchTab('corridas');
    
    // limpar o avatar do cabecalho
    dom.btnProfileTrigger.innerHTML = '<i class="fa-regular fa-user"></i>';

    setTimeout(() => {
      dom.authSignupBox.classList.add('hidden');
      dom.authLoginBox.classList.remove('hidden');
    }, 600);
  }

  /* secao
 * 17 utilitarios gerais helper functions
secao */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3500);
  }

  function playSystemSound() {
    if (!AppState.settings.sounds) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(450, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.05);
    } catch (e) {}
  }

  function getTodayFormattedDate() {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const today = new Date();
    return today.toLocaleDateString('en-US', options);
  }

  function getCurrentTimeFormatted() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatCurrency(val) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  function openBottomSheet(sheetName) {
    closeBottomSheets();
    const sheet = document.getElementById(`${sheetName}-sheet`);
    if (sheet) {
      sheet.classList.remove('hidden');
      sheet.classList.add('active');
      if (sheetName === 'ride-options') {
        dom.appContainer.classList.add('bottom-sheet-active');
      } else if (sheetName === 'trip-status') {
        dom.appContainer.classList.add('bottom-sheet-active-trip');
      }
      playSystemSound();
    }
  }

  function closeBottomSheets() {
    if (dom.rideOptionsSheet) {
      dom.rideOptionsSheet.classList.remove('active');
      dom.rideOptionsSheet.classList.add('hidden');
    }
    if (dom.tripStatusSheet) {
      dom.tripStatusSheet.classList.remove('active');
      dom.tripStatusSheet.classList.add('hidden');
    }
    
    dom.appContainer.classList.remove('bottom-sheet-active');
    dom.appContainer.classList.remove('bottom-sheet-active-trip');
  }

  // Processador de Deep Link para retorno do Google OAuth (appentrega://google-auth)
  window.handleOAuthRedirect = async function(url) {
    try {
      showToast('Processando autenticação do Google...', 'info');
      console.log('OAuth redirect URL recebida:', url);

      let accessToken = null;
      let refreshToken = null;
      let code = null;

      // Extrair parâmetros do hash (#access_token=...&refresh_token=...)
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        const hashStr = url.substring(hashIndex + 1);
        const params = new URLSearchParams(hashStr);
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
      }

      // Extrair parâmetros da query (?code=... ou ?access_token=...)
      const queryIndex = url.indexOf('?');
      if (queryIndex !== -1) {
        const queryEnd = hashIndex !== -1 ? hashIndex : url.length;
        const queryStr = url.substring(queryIndex + 1, queryEnd);
        const params = new URLSearchParams(queryStr);
        if (!accessToken) accessToken = params.get('access_token');
        if (!refreshToken) refreshToken = params.get('refresh_token');
        code = params.get('code');
      }

      if (accessToken && refreshToken && window.dbManager && window.dbManager.supabase) {
        const { data, error } = await window.dbManager.supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) throw error;
        
        const authUser = data.user || (await window.dbManager.supabase.auth.getUser()).data.user;
        if (authUser) {
          const profile = await window.dbManager.getProfileOrFallback(authUser);
          await loginSession(profile);
          showToast('Login com Google concluído com sucesso! 🎉', 'success');
          return;
        }
      } else if (code && window.dbManager && window.dbManager.supabase) {
        const { data, error } = await window.dbManager.supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (data && data.user) {
          const profile = await window.dbManager.getProfileOrFallback(data.user);
          await loginSession(profile);
          showToast('Login com Google concluído com sucesso! 🎉', 'success');
          return;
        }
      }

      // Fallback: verificar se já há sessão ativa no Supabase
      if (window.dbManager && window.dbManager.supabase) {
        const { data: { session } } = await window.dbManager.supabase.auth.getSession();
        if (session && session.user) {
          const profile = await window.dbManager.getProfileOrFallback(session.user);
          await loginSession(profile);
          showToast('Login com Google autenticado! 🎉', 'success');
          return;
        }
      }
    } catch (err) {
      console.error('Erro ao processar retorno OAuth:', err);
      showToast('Erro ao autenticar com o Google: ' + (err.message || 'Tente novamente'), 'error');
    }
  };

  /* secao
 * 18 inicializacao e bootstrap do banco de dados
secao */
  async function bootstrap() {
    try {
      // 1 inicializar o banco unificado (Supabase online ou SQLite local)
      await window.dbManager.init();

      // Verificar se há deep link pendente vindo do MainActivity
      if (window._pendingOAuthUrl) {
        const pending = window._pendingOAuthUrl;
        window._pendingOAuthUrl = null;
        await window.handleOAuthRedirect(pending);
        return;
      }
      
      // 2 verificar se ha sessao ativa no Supabase (incluindo retorno de Google OAuth)
      if (window.dbManager.isSupabaseMode && window.dbManager.supabase) {
        try {
          const { data: { session } } = await window.dbManager.supabase.auth.getSession();
          if (session && session.user) {
            console.log('Sessao Supabase ativa encontrada:', session.user.email);
            const user = await window.dbManager.getProfileOrFallback(session.user);
            await loginSession(user);
            return;
          }

          // Listener reativo caso o redirect do Google OAuth termine de processar os tokens na URL
          window.dbManager.supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session && session.user) {
              console.log('Login OAuth detectado via onAuthStateChange:', session.user.email);
              const user = await window.dbManager.getProfileOrFallback(session.user);
              await loginSession(user);
            }
          });
        } catch (e) {
          console.warn('Aviso ao checar sessao Supabase:', e);
        }
      }

      // 3 verificar se ha sessao de login anterior persistida localmente
      const savedUserId = localStorage.getItem('activeUserId');
      if (savedUserId) {
        try {
          const res = await window.dbManager.query('SELECT * FROM users WHERE id = ?', [parseInt(savedUserId)]);
          if (res && res.rows && res.rows.length > 0) {
            const loggedUser = res.rows.item(0);
            console.log(`sessao ativa recuperada ${loggedUser.name} id ${loggedUser.id}`);
            await loginSession(loggedUser);
            return;
          }
        } catch (e) {
          console.warn('Aviso ao consultar sessao local:', e);
        }
      }
      
      // caso nao haja login salvo exibir tela de autenticacao
      dom.appContainer.classList.add('logged-out');
      console.log('nenhuma sessao recuperada login');
      
    } catch (err) {
      console.error('erro bootstrap', err);
      showToast('Falha na inicialização do sistema.', 'error');
    }
  }

  // inicializar aplicativo
  bootstrap();

  } catch (err) {
    alert("🔴 CRASH EM initApp:\n" + err.message + "\n" + err.stack);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
