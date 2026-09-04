export const OSM_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0;background:#e8eef3;}
  .price-pin{background:#1B7D2C;color:#fff;border-radius:10px;padding:3px 7px;font:800 11px/1.2 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;border:1px solid #145c21;}
  .price-pin.sel{background:#F59E0B;border-color:#B45309;color:#111;}
  .cat-dot{width:12px;height:12px;border-radius:8px;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.2);}
  .leaflet-control-attribution{font-size:9px;}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([28.3949, 84.1240], 7);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Tiles &copy; Esri'
}).addTo(map);
var layer = L.layerGroup().addTo(map);
var userMarker = null;
var pickMarker = null;
var mode = 'browse';
var selectedId = '';

function post(payload) {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
}
function catColor(cat) {
  if (cat === 'property') return '#22c55e';
  if (cat === 'vehicles') return '#3b82f6';
  if (cat === 'jobs') return '#f97316';
  if (cat === 'services') return '#a855f7';
  if (cat === 'marketplace') return '#14b8a6';
  if (cat === 'business') return '#ef4444';
  return '#94a3b8';
}
function setUser(lat, lng) {
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat, lng], { radius: 8, color: '#60a5fa', fillColor: '#3b82f6', fillOpacity: 0.95, weight: 3 }).addTo(map);
}
function setPick(lat, lng) {
  if (pickMarker) map.removeLayer(pickMarker);
  pickMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
  pickMarker.on('dragend', function() {
    var p = pickMarker.getLatLng();
    post({ type: 'pin', lat: p.lat, lng: p.lng });
  });
}
function apply(state) {
  mode = state.mode || 'browse';
  selectedId = state.selectedId || '';
  if (state.center) map.setView([state.center.lat, state.center.lng], state.zoom || map.getZoom());
  if (state.user) setUser(state.user.lat, state.user.lng);
  if (mode === 'pick' && state.pin) setPick(state.pin.lat, state.pin.lng);
  layer.clearLayers();
  (state.markers || []).forEach(function(m) {
    var sel = m.id === selectedId;
    var html = m.kind === 'category'
      ? '<div class="cat-dot" style="background:' + catColor(m.category) + '"></div>'
      : '<div class="price-pin' + (sel ? ' sel' : '') + '">' + (m.label || '') + '</div>';
    var icon = L.divIcon({ className: '', html: html, iconSize: [0, 0], iconAnchor: [20, 14] });
    var mk = L.marker([m.lat, m.lng], { icon: icon }).addTo(layer);
    mk.on('click', function() { post({ type: 'select', id: m.id }); });
  });
}
function sendBounds() {
  var b = map.getBounds();
  var c = map.getCenter();
  post({ type: 'bounds', minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast(), lat: c.lat, lng: c.lng, zoom: map.getZoom() });
}
map.on('click', function(e) {
  if (mode !== 'pick') return;
  setPick(e.latlng.lat, e.latlng.lng);
  post({ type: 'pin', lat: e.latlng.lat, lng: e.latlng.lng });
});
map.on('moveend', sendBounds);
function onMsg(raw) {
  try { apply(JSON.parse(typeof raw === 'string' ? raw : raw.data)); } catch (e) {}
}
document.addEventListener('message', function(e) { onMsg(e.data); });
window.addEventListener('message', function(e) { onMsg(e.data); });
post({ type: 'ready' });
</script>
</body>
</html>`;
