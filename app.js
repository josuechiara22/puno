const LY_LOTES_ID = 'flLotes';
const LY_CATASTRO_ID = 'catastro-layer';
let app = {};

require([
    "esri/Map",
    "esri/views/MapView",
    "esri/request",
    "esri/symbols/TextSymbol",
    "esri/layers/GraphicsLayer",
    "esri/layers/MapImageLayer",
    "esri/layers/FeatureLayer",
    "esri/widgets/Search",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Legend",
    "esri/widgets/LayerList",
    "esri/widgets/Print",
    "dojo/text!./js/appConfig.json",
    "app/widgets/FiltroAvanzado/FiltroAvanzado",
    "app/widgets/MapasTematicos/MapasTematicos",
    "app/widgets/ZoomXY/ZoomXY",
    "app/widgets/StreetView/StreetView",
    "app/widgets/WidgetContainer/WidgetContainer",
    "dojo/domReady!"
], function(
    Map,
    MapView,
    esriRequest,
    TextSymbol,
    GraphicsLayer,
    MapImageLayer,
    FeatureLayer,
    Search,
    BasemapGallery,
    Legend,
    LayerList,
    Print,
    Config,
    FiltroAvanzado,
    MapasTematicos,
    ZoomXY,
    StreetView
) {
    const appConfig = JSON.parse(Config);

    // IDs desde config
    const linderosLayerId = appConfig["servicio-catastro"].linderosLayerId;
    const construccionLayerId = appConfig["servicio-catastro"].construccionLayerId;
    const jardinLayerId = appConfig["servicio-catastro"].jardinLayerId;
    const veredaLayerId = appConfig["servicio-catastro"].veredaLayerId;
    const bermaLateralLayerId = appConfig["servicio-catastro"].bermaLateralLayerId;
    const bermaCentralLayerId = appConfig["servicio-catastro"].bermaCentralLayerId;
    const areasVerdesLayerId = appConfig["servicio-catastro"].areasVerdesLayerId;
    const sectoresLayerId = appConfig["servicio-catastro"].sectoresLayerId;
    const lotesLayerId = appConfig["servicio-catastro"].lotesLayerId;
    const manzanasLayerId = appConfig["servicio-catastro"].manzanasLayerId;
    const limiteDistritalLayerId = appConfig["servicio-catastro"].limiteDistritalLayerId;

    app.config = appConfig;

    // Mapa base
    app.map = new Map({
        basemap: 'osm'
    });

    app.view = new MapView({
        container: 'mapView',
        map: app.map,
        extent: {
            "xmin": -7932371.94,
            "ymin": -1903660.31,
            "xmax": -7611947.92,
            "ymax": -1458491.06,
            "spatialReference": { "latestWkid": 3857, "wkid": 102100 }
        }
    });

    // Indicador de carga
    app.view.watch('updating', (isUpdating) => {
        document.getElementById('indicador-carga')
            .classList.toggle('activo', isUpdating);
    });

    // Mostrar coordenadas y fecha de actualización
    app.view.on('pointer-move', evt => {
        let punto = app.view.toMap({ x: evt.x, y: evt.y });
        let coordendasContainer = document.querySelector('#barra-coordenadas .coordenadas');
        let coordenadasUTM = app.latLngToUTM(punto.latitude, punto.longitude);
        coordendasContainer.textContent = 
            `GCS : ${punto.latitude.toFixed(6)}, ${punto.longitude.toFixed(6)} | ` +
            `UTM WGS84: ${coordenadasUTM.x.toFixed(6)}E, ${coordenadasUTM.y.toFixed(6)}N ZONA: ${coordenadasUTM.zona}`;

        let actualizadoContainer = document.querySelector('#barra-actualizado .coordenadas');
        actualizadoContainer.textContent = app.config["fecha-actualizacion"];
    });

    // Capa principal del Catastro
    let lCatastro = new MapImageLayer({
        url: `${app.config["url-server-gis"]}${app.config["servicio-catastro"]["nombre"]}/MapServer`,
        id: LY_CATASTRO_ID,
        title: 'Catastro Municipal'
    });

    // Ejemplo: capa de Lotes
    let lLotes = new FeatureLayer({
        id: LY_LOTES_ID,
        title: 'Lotes',
        url: `${app.config["url-server-gis"]}${app.config["servicio-catastro"]["nombre"]}/MapServer/${lotesLayerId}`,
        outFields: ["*"],
        popupTemplate: {
            title: "Lote",
            content: (element) => {
                let g = element.graphic;
                let coords = app.latLngToUTM(g.geometry.latitude, g.geometry.longitude);
                return `<ul>
                    <li>ID: ${g.attributes['OBJECTID']}</li>
                    <li>GCS: ${g.geometry.latitude.toFixed(6)}, ${g.geometry.longitude.toFixed(6)}</li>
                    <li>UTM: ${coords.x.toFixed(6)}E, ${coords.y.toFixed(6)}N Zona: ${coords.zona}</li>
                </ul>`;
            }
        }
    });

    app.map.layers.addMany([lCatastro, lLotes]);

    // Widgets
    let searchWidget = new Search({ view: app.view });
    app.view.ui.add(searchWidget, { position: "top-left", index: 0 });

    app.legendWidget = new Legend({
        view: app.view,
        container: Widgets.getContainer('leyenda')
    });

    app.printWidget = new Print({
        view: app.view,
        container: Widgets.getContainer('print-map'),
        printServiceUrl: "https://sit.icl.gob.pe/arcgis/rest/services/AGOL_Servicios/ExportWebMap/GPServer/Export%20Web%20Map"
    });

    let layerListWidget = new LayerList({
        view: app.view,
        container: Widgets.getContainer('layer-list')
    });

    let basemapGallery = new BasemapGallery({
        view: app.view,
        container: Widgets.getContainer('basemap-gallery')
    });

    // Widgets personalizados
    app.filtroAvanzado = new FiltroAvanzado(Widgets.getContainer('filtro-avanzado'), {
        view: app.view,
        red: lCatastro,
        configRed: appConfig["servicio-catastro"]
    });

    app.mapasTematicos = new MapasTematicos(Widgets.getContainer('mapas-tematicos'), {
        view: app.view,
        layerSuministros: lLotes,
        layerRed: lCatastro,
        layerSedId: lotesLayerId,
        urlServicio: `${app.config["url-server-gis"]}${app.config["servicio-catastro"]["nombre"]}/MapServer`
    });

    app.streetViewWidget = new StreetView(Widgets.getContainer('streetview'), {
        view: app.view,
        map: app.map
    });

    Widgets.$on('cambioWidget', (e) => {
        if (Widgets.$refs.streetview._data._grupo === e.grupo) {
            app.streetViewWidget.activar(e.widgetId === 'streetview');
        }
    });

    app.filtroAvanzado.on('change', _ => setTimeout(app.mapasTematicos.reload, 2000));
    app.mapasTematicos.on('render-update', () => {
        let info = app.legendWidget.activeLayerInfos.items.find(i => i.layer.id === LY_LOTES_ID);
        if (info) info.buildLegendElementsForRenderer();
    });

    // Conversión Lat/Lon a UTM
    app.latLngToUTM = function(lat, lon) {
        let xy = new Array(2);
        let zone = Math.floor((lon + 180.0) / 6) + 1;
        LatLonToUTMXY(DegToRad(lat), DegToRad(lon), zone, xy);
        return { x: xy[0], y: xy[1], zona: zone };
    };

    app.ZoomXY = new ZoomXY(Widgets.getContainer('zoomxy'), {
        view: app.view,
        red: lCatastro,
        configRed: appConfig["servicio-catastro"]
    });
});
