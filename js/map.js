/*************************
 * SETUP MAL TILE LAYERS *
 *************************/

//URL from map tile servers
osm_source = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
opentopo_source = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
satellit_source = 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
opnv_source = 'http://tile.memomaps.de/tilegen/{z}/{x}/{y}.png';

//Attribution of map providers 
osm_attrib = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors CC-BY-SA';
opentopo_attrib = 'Kartendaten:' + osm_attrib + ' | Kartendarstellung: &copy;  <a href="https://opentopomap.org/about">OpenTopoMap</a> CC-BY-SA';
satellit_attrib = 'Map data &copy; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
opnv_attrib = '<a href="https://memomaps.de/" > MeMoMaps</a> CC-BY-SA | ' + osm_attrib;

//Init map tile layers
var osm = L.tileLayer(osm_source, { maxZoom: 17, attribution: osm_attrib });
var opentopo = L.tileLayer(opentopo_source, { maxZoom: 17, attribution: opentopo_attrib });
var satellit = L.tileLayer(satellit_source, { maxZoom: 17, attribution: satellit_attrib });
var opnv = L.tileLayer(opnv_source, { maxZoom: 17, attribution: opnv_attrib });

//Combine map tile layer ins one dict
var baseLayers = {
	"OpenStreetMap": osm,
	"Open Topo": opentopo,
	"Satellit": satellit,
	"ÖPNV": opnv
};

/***************
 * SETUP ICONS *
 ***************/

//Create Template Icon Class
var tmpl_icon = L.Icon.extend({
	options: {
		iconUrl: "foo.png",
		iconSize: [33, 47],
		iconAnchor: [16, 47],
		popupAnchor: [0, -50],
		draggable: false,
		riseOnHover: true
	}
});

//Init three instances of class template icon 
var icon_campside = new tmpl_icon({ 'iconUrl': 'icons/tent_icon.png' }),
	icon_house = new tmpl_icon({ 'iconUrl': 'icons/house_icon.png' }),
	icon_mixed = new tmpl_icon({ 'iconUrl': 'icons/mixed_icon.png' }),
	icon_jamboree = new tmpl_icon({ 'iconUrl': 'icons/jamboree_icon.png' }),
	icon_jamborette = new tmpl_icon({ 'iconUrl': 'icons/jamborette_icon.png' }),
	icon_poi = new tmpl_icon({ 'iconUrl': 'icons/poi_icon.png' }),
	icon_circle = new tmpl_icon({ 'iconUrl': 'icons/circle_icon.png' });


//Init icon layer groups
var campside_house = new L.LayerGroup(),
	campside_yard = new L.LayerGroup(),
	campside_mixed = new L.LayerGroup(),
	campsite_jamboree = new L.LayerGroup(),
	campsite_jamborette = new L.LayerGroup(),
	marker_circles = new L.LayerGroup(),
	marker_poi = new L.LayerGroup();

/*****************
 * SETUP MARKERS *
 *****************/
var cathegory_types = ["tent", "house", "mixed", "jamboree", "jamborette"]
var layer_list = [campside_yard, campside_house, campside_mixed, campsite_jamboree, campsite_jamborette];
var icon_list = [icon_campside, icon_house, icon_mixed, icon_jamboree, icon_jamborette];


function selectBasedOnCathegory(feature, list){
	return list[cathegory_types.indexOf(feature.properties.cathegory)];
}

function onEachFeature(feature, layer) {
	layer.bindPopup(feature.properties.name);
	layer.on('mouseover', function (e) { this.openPopup(); });
	layer.on('mouseover', highlightFeature);
	layer.on('mouseout', resetHighlight);
	layer.on('mouseout', function (e) { this.closePopup(); });
	
	layer.addTo(selectBasedOnCathegory(feature, layer_list));
}

L.geoJSON(geojsonFeature, {
	pointToLayer: function (feature, latlng) {
			return L.marker(latlng, {icon: selectBasedOnCathegory(feature, icon_list)});
	},
  //filter: soffParkingFilter,
	onEachFeature: onEachFeature
});


//Create dicts for control box
var overlays = {
	"Lagerplatz mit Haus: ": campside_house,
	"Lagerplatz mit Zeltplatz": campside_yard,
	"Mixed": campside_mixed,
	"Jamborette": campsite_jamborette,
	"Jamboree": campsite_jamboree
};

/**************************************
 * SETUP MAP AND MAP CONTROL ELEMENTS *
 **************************************/
//Home point of view

var home = {
	lat: 47.5,
	lng: 14,
	zoom: 8
};


//Init map
var campsides_map = L.map('map', {
	center: [home.lat, home.lng],
	zoom: home.zoom,
	minZoom: 6,
	attributionControl: true,
	zoomControl: false,
	measureControl: false,
	dragging: true,
	layers: [osm, campside_house, campside_yard, campside_mixed, campsite_jamboree, campsite_jamborette]
});

//Add layers to map 
L.control.layers(baseLayers, overlays, {
	collapsed: true,
	position: 'topright'
}).addTo(campsides_map);

//Add special marker layers to map
campsides_map.addLayer(marker_circles);
campsides_map.addLayer(marker_poi);
geoJSONLayer = L.geoJSON().addTo(campsides_map);


//Create and add zoom controls 
L.control.zoom({
	position: 'topright'
}).addTo(campsides_map);

//Create and add scale controls
L.control.scale({
	metric: true,
	imperial: false,
}).addTo(campsides_map);


//Add home button
L.easyButton('fas fa-home', function (btn, map) {
	map.setView(new L.LatLng(home.lat, home.lng), home.zoom,);
}, {
	position: 'topright'
}).addTo(campsides_map);

//Add infobox about campsides
var info = L.control({
	position: 'topleft'
});

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.update();
    return this._div;
};

// method that we will use to update the control based on feature properties passed
info.update = function (props) {
    this._div.innerHTML = '<h4>Infos zu dem Lagerplatz</h4>' +  (props ?
        '<b class="name">' + props.name + '</b><br /><p>' + formatContent(props.content)  : 'Wähle eine Ort aus</p>');
};

function formatContent(allContent) {
	var content = "";
	if(allContent.length > 1){
		for(let i = 0; i < allContent.length; i++){
			content += allContent[i];
			content += '</p><p>'
		}
	}
	else content = allContent;
	return content;
}

info.addTo(campsides_map);


//Add 19er Branding to Map
var branding = L.control({
	position: 'bottomright'
});

branding.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'logo'); // create a div with a class "info"
    div.innerHTML = '<img src="19er_logo.png"  width="88" height="49"> ';
	return div;
};

branding.addTo(campsides_map);


/**************************************
 * SETUP MAP AND MAP CONTROL ELEMENTS *
 **************************************/
function highlightFeature(e) {
    info.update(e.target.feature.properties);
	e.target.bringToFront();
}

function resetHighlight(e) {
    info.update();
}