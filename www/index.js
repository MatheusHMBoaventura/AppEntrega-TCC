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

    // fazer scroll do mapa caso volte para corridas
    if (tabId === 'corridas' && map) {
      setTimeout(() => {
        map.invalidateSize();
        map.panTo(MAP_CENTER);
      }, 300);
    }
    
    playSystemSound();
  }

  /* secao
 * 4 mapa interativo simulacoes leaflet engine
secao */
  let map;
  let userMarker;
  let destinationMarker;
  let driverMarkers = [];
  let routePolyline = null;
  let simulatedDriversInterval = null;
  
  // icones personalizados inicializados de forma tardia e segura para evitar falhas se estiver sem internet
  let iconUser = null;
  let iconDestination = null;

  function getIconUser() {
    if (!iconUser && typeof L !== 'undefined') {
      iconUser = L.divIcon({
        className: 'user-location-marker-container',
        html: '<div class="user-location-marker"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
    }
    return iconUser;
  }

  function getIconDestination() {
    if (!iconDestination && typeof L !== 'undefined') {
      iconDestination = L.divIcon({
        className: 'destination-marker-container',
        html: '<i class="fa-solid fa-location-dot destination-marker"></i>',
        iconSize: [24, 24],
        iconAnchor: [12, 24]
      });
    }
    return iconDestination;
  }

  const getIconDriver = (angle = 0) => {
    if (typeof L === 'undefined') return null;
    return L.divIcon({
      className: 'driver-car-marker-container',
      html: `<i class="fa-solid fa-car-side driver-car-marker" style="transform: rotate(${angle}deg);"></i>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  };

  function initMap() {
    if (typeof L === 'undefined') {
      console.warn('leaflet map nao carregado mapa ignorado');
      showToast('Mapa temporariamente indisponível no modo off-line.', 'info');
      return;
    }
    if (map) return; // evita duplicidade

    // criar mapa
    map = L.map('map', {
      center: MAP_CENTER,
      zoom: 15,
      zoomControl: false // ocultar controles nativos
    });

    // adicionar camada cartodb positron
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https:// cartocomattributions>carto<a>
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // marcador do usuario
    userMarker = L.marker(MAP_CENTER, { icon: getIconUser() }).addTo(map);

    // inicializar carros dos motoristas parceiros na area
    spawnSimulatedDrivers();

    // clique no mapa para definir destino manualmente
    map.on('click', (e) => {
      if (AppState.activeTrip.status !== 'idle' && AppState.activeTrip.status !== 'selecting') return;
      
      const clickedCoords = e.latlng;
      setDestination(clickedCoords.lat, clickedCoords.lng, `Coordenadas: ${clickedCoords.lat.toFixed(4)}, ${clickedCoords.lng.toFixed(4)}`);
    });
  }

  // criar marcadores de motoristas ao redor
  function spawnSimulatedDrivers() {
    if (typeof L === 'undefined' || !map) return;
    driverMarkers.forEach(m => map.removeLayer(m.marker));
    driverMarkers = [];

    MOCK_DRIVERS.forEach(driver => {
      const lat = MAP_CENTER[0] + driver.latOffset;
      const lng = MAP_CENTER[1] + driver.lngOffset;
      
      const angle = Math.floor(Math.random() * 360);
      const marker = L.marker([lat, lng], { icon: getIconDriver(angle) }).addTo(map);
      
      driverMarkers.push({
        marker: marker,
        data: driver,
        lat: lat,
        lng: lng,
        angle: angle
      });
    });

    // intervalo para mover carros sutilmente de 3 em 3 segundos
    if (simulatedDriversInterval) clearInterval(simulatedDriversInterval);
    simulatedDriversInterval = setInterval(() => {
      if (AppState.activeTrip.status === 'trip_active' || AppState.activeTrip.status === 'driver_on_way') return;

      driverMarkers.forEach(d => {
        const offsetLat = (Math.random() - 0.5) * 0.0006;
        const offsetLng = (Math.random() - 0.5) * 0.0006;
        d.lat += offsetLat;
        d.lng += offsetLng;
        d.angle = offsetLng > 0 ? 90 : 270;
        
        d.marker.setLatLng([d.lat, d.lng]);
        d.marker.setIcon(getIconDriver(d.angle));
      });
    }, 3000);
  }

  /* secao
 * 5 busca autocomplete search autocomplete system
secao */
  dom.inputDestination.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query.length > 0) {
      dom.btnClearSearch.classList.remove('hidden');
      
      // filtrar sugestoes
      const filtered = LOCATION_SUGGESTIONS.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.desc.toLowerCase().includes(query)
      );

      renderSuggestions(filtered);
    } else {
      hideSuggestions();
    }
  });

  dom.btnClearSearch.addEventListener('click', () => {
    dom.inputDestination.value = '';
    hideSuggestions();
    resetSearchState();
  });

  function renderSuggestions(list) {
    if (list.length === 0) {
      dom.searchSuggestions.innerHTML = `
        <div class="suggestion-item">
          <i class="fa-solid fa-circle-question"></i>
          <div class="suggestion-info">
            <span class="suggestion-name">Nenhum local encontrado</span>
            <span class="suggestion-desc">Tente digitar outro endereço</span>
          </div>
        </div>
      `;
    } else {
      dom.searchSuggestions.innerHTML = list.map(item => `
        <div class="suggestion-item" data-lat="${item.lat}" data-lng="${item.lng}" data-name="${item.name}" data-mult="${item.mult}">
          <i class="fa-solid fa-location-dot"></i>
          <div class="suggestion-info">
            <span class="suggestion-name">${item.name}</span>
            <span class="suggestion-desc">${item.desc}</span>
          </div>
        </div>
      `).join('');

      // adicionar evento de clique em cada sugestao
      const items = dom.searchSuggestions.querySelectorAll('.suggestion-item');
      items.forEach(el => {
        el.addEventListener('click', () => {
          const lat = parseFloat(el.getAttribute('data-lat'));
          const lng = parseFloat(el.getAttribute('data-lng'));
          const name = el.getAttribute('data-name');
          const multiplier = parseFloat(el.getAttribute('data-mult'));
          
          setDestination(lat, lng, name, multiplier);
          hideSuggestions();
        });
      });
    }
    
    dom.searchSuggestions.classList.add('active');
  }

  function hideSuggestions() {
    dom.searchSuggestions.classList.remove('active');
    dom.btnClearSearch.classList.add('hidden');
  }

  function resetSearchState() {
    if (typeof L !== 'undefined' && map) {
      if (destinationMarker) {
        map.removeLayer(destinationMarker);
        destinationMarker = null;
      }
      if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
      }
      map.panTo(MAP_CENTER);
    } else {
      destinationMarker = null;
      routePolyline = null;
    }
    closeBottomSheets();
    spawnSimulatedDrivers();
  }

  /* secao
 * 6 fluxo de corrida e bottom sheets ride booking system
secao */
  function setDestination(lat, lng, name, multiplier = 1.0) {
    AppState.activeTrip.destination = { lat, lng, address: name };
    AppState.activeTrip.status = 'selecting';

    if (typeof L !== 'undefined' && map) {
      // colocar ou mover marcador de destino
      if (destinationMarker) {
        destinationMarker.setLatLng([lat, lng]);
      } else {
        destinationMarker = L.marker([lat, lng], { icon: getIconDestination() }).addTo(map);
      }

      // desenhar rota ficticia pontilhada
      if (routePolyline) map.removeLayer(routePolyline);
      routePolyline = L.polyline([MAP_CENTER, [lat, lng]], {
        color: '#0f1013',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8'
      }).addTo(map);

      // ajustar mapa para focar na partida e destino
      const bounds = L.latLngBounds([MAP_CENTER, [lat, lng]]);
      map.fitBounds(bounds, { padding: [80, 80] });
    }

    dom.routeStartText.innerText = 'Av. Paulista, 1000 (Sua Localização)';
    dom.routeEndText.innerText = name;

    const distanceKm = calculateDistance(MAP_CENTER[0], MAP_CENTER[1], lat, lng);
    
    const priceStd = Math.max(8.50, (distanceKm * 3.20 + 5.0) * multiplier);
    const priceComf = Math.max(12.00, (distanceKm * 4.20 + 7.0) * multiplier);
    const pricePrem = Math.max(18.00, (distanceKm * 6.00 + 10.0) * multiplier);

    document.getElementById('price-standard').innerText = formatCurrency(priceStd);
    document.getElementById('price-comfort').innerText = formatCurrency(priceComf);
    document.getElementById('price-premium').innerText = formatCurrency(pricePrem);

    AppState.activeTrip.prices = {
      standard: priceStd,
      comfort: priceComf,
      premium: pricePrem
    };

    dom.inputDestination.value = name;
    openBottomSheet('ride-options');
  }

  // troca de categorias
  dom.categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      dom.categoryCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      AppState.activeTrip.category = card.getAttribute('data-category');
      playSystemSound();
    });
  });

  dom.btnCloseRideSheet.addEventListener('click', () => {
    resetSearchState();
    dom.inputDestination.value = '';
  });

  dom.btnConfirmRide.addEventListener('click', () => {
    startActiveRideSimulation();
  });

  function startActiveRideSimulation() {
    const selectedCat = AppState.activeTrip.category;
    const finalPrice = AppState.activeTrip.prices[selectedCat];
    AppState.activeTrip.price = finalPrice;
    
    AppState.activeTrip.status = 'searching';
    openBottomSheet('trip-status');
    
    dom.tripStatusTitle.innerText = 'Procurando motorista parceiro...';
    dom.driverAvatar.style.filter = 'blur(4px)';
    dom.driverName.innerText = 'Buscando...';
    dom.driverCarInfo.innerText = 'Verificando veículos na área';
    dom.driverPlate.style.display = 'none';
    dom.driverRatingVal.innerText = '0.0';
    dom.tripProgressBar.style.width = '0%';
    dom.tripEtaStatus.innerText = 'Calculando tempo...';
    dom.tripDistanceStatus.innerText = 'Aguardando aceite';
    dom.btnCancelTrip.style.display = 'block';

    showToast('🚕 Procurando motorista mais próximo...', 'info');

    // timer de 3 segundos
    setTimeout(() => {
      if (AppState.activeTrip.status !== 'searching') return;

      const driver = MOCK_DRIVERS[Math.floor(Math.random() * MOCK_DRIVERS.length)];
      AppState.activeTrip.driver = driver;
      
      AppState.activeTrip.status = 'driver_on_way';
      dom.tripStatusTitle.innerText = 'Motorista a caminho!';
      dom.driverAvatar.src = driver.photo;
      dom.driverAvatar.style.filter = 'none';
      dom.driverName.innerText = driver.name;
      dom.driverCarInfo.innerText = driver.car;
      dom.driverPlate.innerText = driver.plate;
      dom.driverPlate.style.display = 'block';
      dom.driverRatingVal.innerText = driver.rating;
      dom.tripEtaStatus.innerText = 'Chegada em 3 min';
      dom.tripDistanceStatus.innerText = '1.2 km de distância';

      showToast(`⚡ ${driver.name} aceitou a corrida!`, 'success');
      playSystemSound();

      animateDriverToUser();
    }, 3000);
  }

  function animateDriverToUser() {
    const driver = AppState.activeTrip.driver;
    const driverStartLat = MAP_CENTER[0] + driver.latOffset;
    const driverStartLng = MAP_CENTER[1] + driver.lngOffset;

    let activeDriverMarker = null;
    if (typeof L !== 'undefined' && map) {
      driverMarkers.forEach(m => map.removeLayer(m.marker));
      activeDriverMarker = L.marker([driverStartLat, driverStartLng], { icon: getIconDriver(0) }).addTo(map);
      
      if (routePolyline) map.removeLayer(routePolyline);
      routePolyline = L.polyline([[driverStartLat, driverStartLng], MAP_CENTER], {
        color: '#10b981',
        weight: 5,
        opacity: 0.9
      }).addTo(map);

      map.fitBounds(routePolyline.getBounds(), { padding: [60, 60] });
    }

    let step = 0;
    const totalSteps = 5;
    
    const journeyInterval = setInterval(() => {
      if (AppState.activeTrip.status !== 'driver_on_way') {
        clearInterval(journeyInterval);
        if (typeof L !== 'undefined' && map && activeDriverMarker) {
          map.removeLayer(activeDriverMarker);
        }
        return;
      }

      step++;
      const ratio = step / totalSteps;
      
      const currLat = driverStartLat + (MAP_CENTER[0] - driverStartLat) * ratio;
      const currLng = driverStartLng + (MAP_CENTER[1] - driverStartLng) * ratio;
      
      if (typeof L !== 'undefined' && map) {
        if (activeDriverMarker) activeDriverMarker.setLatLng([currLat, currLng]);
        if (routePolyline) routePolyline.setLatLngs([[currLat, currLng], MAP_CENTER]);
      }

      dom.tripEtaStatus.innerText = `Chegada em ${Math.max(1, 4 - step)} min`;
      dom.tripDistanceStatus.innerText = `${((1.0 - ratio * 0.9) * 1.2).toFixed(1)} km restantes`;
      dom.tripProgressBar.style.width = `${ratio * 30}%`;

      if (step === totalSteps) {
        clearInterval(journeyInterval);
        
        AppState.activeTrip.status = 'trip_active';
        dom.tripStatusTitle.innerText = 'Viagem em andamento';
        dom.tripEtaStatus.innerText = 'Chegando ao destino...';
        showToast('👋 Motorista chegou! Tenha uma excelente viagem.', 'info');
        playSystemSound();

        animateTripToDestination(activeDriverMarker);
      }
    }, 2000);
  }

  function animateTripToDestination(driverMarkerInstance) {
    const dest = AppState.activeTrip.destination;
    
    if (typeof L !== 'undefined' && map) {
      if (routePolyline) map.removeLayer(routePolyline);
      routePolyline = L.polyline([MAP_CENTER, [dest.lat, dest.lng]], {
        color: '#0f1013',
        weight: 6,
        opacity: 0.9
      }).addTo(map);

      map.fitBounds(routePolyline.getBounds(), { padding: [60, 60] });
    }

    let step = 0;
    const totalSteps = 6;
    const startLat = MAP_CENTER[0];
    const startLng = MAP_CENTER[1];

    const journeyInterval = setInterval(async () => {
      if (AppState.activeTrip.status !== 'trip_active') {
        clearInterval(journeyInterval);
        if (typeof L !== 'undefined' && map && driverMarkerInstance) {
          map.removeLayer(driverMarkerInstance);
        }
        return;
      }

      step++;
      const ratio = step / totalSteps;
      
      const currLat = startLat + (dest.lat - startLat) * ratio;
      const currLng = startLng + (dest.lng - startLng) * ratio;

      if (typeof L !== 'undefined' && map) {
        if (driverMarkerInstance) driverMarkerInstance.setLatLng([currLat, currLng]);
        if (userMarker) userMarker.setLatLng([currLat, currLng]);
        if (routePolyline) routePolyline.setLatLngs([[currLat, currLng], [dest.lat, dest.lng]]);
      }

      const totalDist = calculateDistance(startLat, startLng, dest.lat, dest.lng);
      const remainingDist = (totalDist * (1.0 - ratio)).toFixed(1);
      
      dom.tripProgressBar.style.width = `${30 + ratio * 70}%`;
      dom.tripEtaStatus.innerText = `Destino em ${Math.max(1, totalSteps - step + 1)} min`;
      dom.tripDistanceStatus.innerText = `${remainingDist} km restantes`;

      if (step === totalSteps) {
        clearInterval(journeyInterval);
        
        AppState.activeTrip.status = 'arrived';
        dom.tripStatusTitle.innerText = 'Você chegou!';
        dom.tripEtaStatus.innerText = 'Viagem concluída';
        dom.tripDistanceStatus.innerText = '0.0 km';
        dom.btnCancelTrip.innerText = 'Concluir';
        dom.btnCancelTrip.classList.remove('danger');
        dom.btnCancelTrip.classList.add('success');
        
        showToast('🎉 Viagem concluída!', 'success');
        playSystemSound();

        // persistencia real no sqlite
        try {
          await window.dbManager.addRide(
            AppState.activeUser.id, 
            dest.address, 
            getTodayFormattedDate(), 
            formatCurrency(AppState.activeTrip.price)
          );
          // recarregar historico
          AppState.rides = await window.dbManager.getRides(AppState.activeUser.id);
          renderHistoryList();
        } catch (err) {
          console.error('erro ao salvar corrida', err);
        }
      }
    }, 2000);
  }

  dom.btnCancelTrip.addEventListener('click', () => {
    if (AppState.activeTrip.status === 'arrived') {
      showToast('Corrida registrada!', 'success');
    } else {
      showToast('Corrida cancelada.', 'info');
    }
    
    AppState.activeTrip.status = 'idle';
    AppState.activeTrip.destination = null;
    AppState.activeTrip.driver = null;
    
    dom.inputDestination.value = '';
    closeBottomSheets();
    resetSearchState();
    
    userMarker.setLatLng(MAP_CENTER);
    map.panTo(MAP_CENTER);
  });

  dom.btnChatDriver.addEventListener('click', () => {
    if (!AppState.activeTrip.driver) return;
    openSupportChatModal(`Motorista: ${AppState.activeTrip.driver.name}`, 'Viagem Ativa');
  });

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

  dom.fabPayment.addEventListener('click', () => {
    openModal('payments');
  });

  dom.fabQuick.addEventListener('click', () => {
    if (AppState.savedPlaces.length === 0) {
      showToast('Nenhum endereço favoritado para atalho rápido!', 'error');
      return;
    }
    const quickAddress = AppState.savedPlaces[Math.floor(Math.random() * AppState.savedPlaces.length)];
    showToast(`🚀 Corrida expressa para: ${quickAddress.title}!`, 'success');
    setDestination(quickAddress.lat, quickAddress.lng, quickAddress.address);
  });

  dom.btnSheetPaymentSelect.addEventListener('click', () => {
    openModal('payments');
  });

  /* secao
 * 8 sistema de modais e subtelas modals manager
secao */
  function openModal(modalId) {
    const targetModal = document.getElementById(`modal-${modalId}`);
    if (targetModal) {
      targetModal.classList.add('active');
      playSystemSound();
      
      if (modalId === 'payments') {
        renderPaymentCardsList();
        resetAddCardForm();
      } else if (modalId === 'saved-places') {
        renderSavedPlacesList();
      }
    }
  }

  dom.modals.forEach(modal => {
    const closeBtn = modal.querySelector('.btn-close-modal');
    const overlay = modal.querySelector('.modal-overlay');
    
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));
    if (overlay) overlay.addEventListener('click', () => closeModal(modal));
  });

  function closeModal(modalElement) {
    modalElement.classList.remove('active');
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

  /* secao
 * 13 tela de historico renders ride history system
secao */
  function renderHistoryList() {
    if (AppState.rides.length === 0) {
      dom.historyList.innerHTML = '<div style="text-align:center; padding:40px 20px; font-size:0.85rem; color:var(--color-text-muted);">Você ainda não realizou nenhuma corrida. Peça sua primeira corrida agora!</div>';
      return;
    }

    dom.historyList.innerHTML = AppState.rides.map(ride => `
      <div class="history-item-card">
        <div class="hist-icon-container">
          <i class="fa-solid fa-location-dot"></i>
        </div>
        <div class="hist-details">
          <div class="hist-address">${ride.address}</div>
          <div class="hist-date">${ride.date}</div>
        </div>
        <div class="hist-price">${ride.price}</div>
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

  // clique direto no botao de login garantia de execucao no android
  const btnSubmitLogin = document.getElementById('btn-submit-login');
  if (btnSubmitLogin) {
    btnSubmitLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = dom.loginEmail.value.trim();
      const password = dom.loginPassword.value.trim();

      // validacao manual premium
      if (!email) {
        showToast('Por favor, digite seu e-mail.', 'error');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast('Por favor, insira um e-mail válido.', 'error');
        return;
      }
      if (!password) {
        showToast('Por favor, insira sua senha.', 'error');
        return;
      }

      try {
        showToast('🔑 Efetuando login...', 'info');
        // consultar no sqlite
        const user = await window.dbManager.loginUser(email, password);
        
        // iniciar sessao
        await loginSession(user);
        
        // limpar inputs
        dom.formLogin.reset();
        showToast(`Olá, ${user.name}! Login realizado com sucesso.`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // clique direto no botao de cadastro garantia de execucao no android
  const btnSubmitSignup = document.getElementById('btn-submit-signup');
  if (btnSubmitSignup) {
    btnSubmitSignup.addEventListener('click', async (e) => {
      e.preventDefault();
      const name = dom.signupName.value.trim();
      const email = dom.signupEmail.value.trim();
      const phone = dom.signupPhone.value.trim();
      const password = dom.signupPassword.value.trim();
      const confirmPass = dom.signupConfirmPassword.value.trim();

      // validacao manual premium
      if (!name) {
        showToast('Por favor, digite seu nome completo.', 'error');
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
        showToast('Por favor, digite seu telefone.', 'error');
        return;
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

      try {
        showToast('📝 Cadastrando sua conta...', 'info');
        
        // inserir registro no sqlitesupabase
        const newUser = await window.dbManager.registerUser(name, email, phone, password);
        
        // logar automaticamente
        await loginSession(newUser);

        // limpar inputs
        dom.formSignup.reset();
        const isCloud = window.dbManager.isSupabaseMode;
        showToast(isCloud ? 'Conta criada e logada na nuvem Supabase! 🎉' : 'Conta criada e logada no SQLite local!', 'success');
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
    dom.userDisplayName.innerText = user.name;
    dom.userDisplayEmail.innerText = user.email;
    dom.userAvatarImg.src = user.avatar;

    // foto circular premium no cabecalho
    dom.btnProfileTrigger.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;

    // prefill modal editar perfil
    dom.inputProfileName.value = user.name;
    dom.inputProfileEmail.value = user.email;
    dom.inputProfilePhone.value = user.phone;
    dom.editAvatarPreview.src = user.avatar;

    // renderizar listas do usuario
    renderHistoryList();
    renderPaymentCardsList();
    updateSelectedPaymentOnSheet();

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
    
    // voltar para aba home e resetar mapa
    switchTab('corridas');
    resetSearchState();
    
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
    dom.rideOptionsSheet.classList.remove('active');
    dom.rideOptionsSheet.classList.add('hidden');
    dom.tripStatusSheet.classList.remove('active');
    dom.tripStatusSheet.classList.add('hidden');
    
    dom.appContainer.classList.remove('bottom-sheet-active');
    dom.appContainer.classList.remove('bottom-sheet-active-trip');
  }

  /* secao
 * 18 inicializacao e bootstrap do banco de dados
secao */
  async function bootstrap() {
    try {
      // 1 inicializar o banco sqlitewebsql
      await window.dbManager.init();
      
      // 2 verificar se ha sessao de login anterior persistida
      const savedUserId = localStorage.getItem('activeUserId');
      if (savedUserId) {
        // consultar usuario correspondente no sqlite
        const res = await window.dbManager.query('SELECT * FROM users WHERE id = ?', [parseInt(savedUserId)]);
        if (res.rows.length > 0) {
          const loggedUser = res.rows.item(0);
          console.log(`sessao ativa recuperada ${loggedUser.name} id ${loggedUser.id}`);
          await loginSession(loggedUser);
          return;
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
