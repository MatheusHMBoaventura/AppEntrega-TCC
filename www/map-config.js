// Configuração do Mapa - CartoDB Voyager com API Key
const MAP_CONFIG = {
  // Provedor de Mapa
  provider: "CartoDB Voyager",

  // URL dos Tiles do Mapa com API Key (visual bonito, similar ao Google Maps)
  tileUrl: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4vto_1_277071c5156f170efa9d01f4",
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',

  // Servidor OSRM (Open Source Routing Machine) para Cálculo de Rotas Gratuito
  osrmServer: "https://router.project-osrm.org/route/v1/driving",

  // Opções de Exibição
  defaultZoom: 16,
  defaultCenter: [-23.55052, -46.633308] // São Paulo, SP
};

window.MAP_CONFIG = MAP_CONFIG;
