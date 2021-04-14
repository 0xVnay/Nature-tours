export const displayMap = locations => {
  mapboxgl.accessToken =
    "pk.eyJ1IjoidmluYXlsZW9rdW1hciIsImEiOiJja2lpb21iYWoyNmp1MnFvNWc1Z2ZsN3NjIn0.zZwGHyWX_1424kzPP3r_Yw";

  var map = new mapboxgl.Map({
    container: "map", //mapbox will put the map on an element of id: map
    style: "mapbox://styles/vinayleokumar/ckiiqn7xw2y6y19s13h7kbt4e",
    scrollZoom: false
    // center: [-118.113491, 34.111745],
    // zoom: 4,
    // interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    //Create marker
    //our own customization for location marker
    const el = document.createElement("div");
    el.className = "marker";

    //Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: "bottom"
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //Add popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    //Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
