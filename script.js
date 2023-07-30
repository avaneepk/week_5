// Task 1: Create the map
const map = L.map("map", { minZoom: -3 }).setView([65.0, 25.0], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Task 2: Add tooltip for municipality names
function onEachFeature(feature, layer) {
  if (feature.properties && feature.properties.name) {
    layer
      .bindTooltip(feature.properties.name, { permanent: false, sticky: true })
      .openTooltip();
  }
}
const geojsonLayer = L.geoJSON(null, {
  onEachFeature: onEachFeature,
  style: function (feature) {
    return { weight: 2 };
  }
}).addTo(map);

// Task 3: Fetch migration data and add popup for positive/negative migration
async function fetchMigrationData() {
  const positiveMigrationUrl =
    "https://statfin.stat.fi/PxWeb/sq/4bb2c735-1dc3-4c5e-bde7-2165df85e65f";
  const negativeMigrationUrl =
    "https://statfin.stat.fi/PxWeb/sq/944493ca-ea4d-4fd9-a75c-4975192f7b6e";
  const [positiveResponse, negativeResponse] = await Promise.all([
    fetch(positiveMigrationUrl),
    fetch(negativeMigrationUrl)
  ]);
  const positiveData = await positiveResponse.json();
  const negativeData = await negativeResponse.json();

  // Combine the positive and negative migration data using municipality code as the key
  const migrationData = {};
  positiveData.dataset.value.forEach((item) => {
    migrationData[item.key] = { positive: item.value };
  });
  negativeData.dataset.value.forEach((item) => {
    if (migrationData[item.key]) {
      migrationData[item.key].negative = item.value;
    }
  });

  // Add popups with migration data
  function getPopupContent(feature) {
    const code = feature.properties.code;
    const municipalityData = migrationData[code];
    if (municipalityData) {
      const positive = municipalityData.positive || 0;
      const negative = municipalityData.negative || 0;
      return `<b>${feature.properties.name}</b><br>Positive Migration: ${positive}<br>Negative Migration: ${negative}`;
    } else {
      return `<b>${feature.properties.name}</b><br>No migration data available`;
    }
  }
  geojsonLayer.bindPopup(getPopupContent);
}

// Task 4: Fetch GeoJSON data and fit the map
async function fetchGeoJSONData() {
  const geoJSONUrl =
    "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326";
  const response = await fetch(geoJSONUrl);
  const geojsonData = await response.json();
  geojsonLayer.addData(geojsonData);
  map.fitBounds(geojsonLayer.getBounds());
}

// Task 5: Apply conditional map styling
function calculateHue(positive, negative) {
  const ratio = (positive / negative) ** 3;
  const hue = Math.min(ratio * 60, 120);
  return hue;
}
function getColor(feature) {
  const code = feature.properties.code;
  const municipalityData = migrationData[code];
  if (municipalityData) {
    const positive = municipalityData.positive || 0;
    const negative = municipalityData.negative || 0;
    const hue = calculateHue(positive, negative);
    return `hsl(${hue}, 75%, 50%)`;
  } else {
    return "gray";
  }
}
geojsonLayer.setStyle(function (feature) {
  return {
    fillColor: getColor(feature),
    weight: 2
  };
});

// Run the functions to fetch data and apply map styling
fetchMigrationData();
fetchGeoJSONData();
