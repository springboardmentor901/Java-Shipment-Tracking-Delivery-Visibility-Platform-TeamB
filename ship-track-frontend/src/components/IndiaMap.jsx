
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

function toCoordinate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export default function IndiaMap({
  pickupLatitude,
  pickupLongitude,
  deliveryLatitude,
  deliveryLongitude,
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState("");
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const pickupLat = toCoordinate(pickupLatitude);
  const pickupLng = toCoordinate(pickupLongitude);
  const deliveryLat = toCoordinate(deliveryLatitude);
  const deliveryLng = toCoordinate(deliveryLongitude);

  const valid =
    pickupLat !== null &&
    pickupLng !== null &&
    deliveryLat !== null &&
    deliveryLng !== null &&
    Math.abs(pickupLat) <= 90 &&
    Math.abs(deliveryLat) <= 90 &&
    Math.abs(pickupLng) <= 180 &&
    Math.abs(deliveryLng) <= 180;

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    if (!token) {
      setMapError("Mapbox token is missing. Check your frontend .env file.");
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [85.8245, 20.2961],
      zoom: 5,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("error", (event) => {
      console.error("Mapbox map error:", event.error);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
   const map = mapRef.current;
if (!map) return;

    let cancelled = false;
    let pickupMarker;
    let deliveryMarker;

    async function drawRoute() {
      setMapError("");
      setRouteInfo(null);

      if (!valid) {
        setRouteLoading(false);
        setMapError(
          "Pickup or delivery coordinates are missing. Fix shipment geocoding first."
        );
        return;
      }

      setRouteLoading(true);

      try {
        await new Promise((resolve, reject) => {
          if (map.isStyleLoaded()) {
            resolve();
          } else {
            map.once("load", resolve);
            map.once("error", reject);
          }
        });

        if (cancelled) return;

        pickupMarker = new mapboxgl.Marker({ color: "#059669" })
          .setLngLat([pickupLng, pickupLat])
          .setPopup(new mapboxgl.Popup().setText("Pickup location"))
          .addTo(map);

        deliveryMarker = new mapboxgl.Marker({ color: "#ea580c" })
          .setLngLat([deliveryLng, deliveryLat])
          .setPopup(new mapboxgl.Popup().setText("Delivery location"))
          .addTo(map);

        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([pickupLng, pickupLat]);
        bounds.extend([deliveryLng, deliveryLat]);

        map.fitBounds(bounds, { padding: 60, maxZoom: 13 });

        const coordinates =
          `${pickupLng},${pickupLat};${deliveryLng},${deliveryLat}`;

        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}` +
          `?overview=full&geometries=geojson&access_token=${encodeURIComponent(
            import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
          )}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || data.code !== "Ok" || !data.routes?.length) {
          throw new Error(
            data.message || data.code || "Mapbox could not find a driving route."
          );
        }

        if (cancelled) return;

        const route = data.routes[0];
        const sourceData = {
          type: "Feature",
          properties: {},
          geometry: route.geometry,
        };

        if (map.getSource("shipment-route")) {
          map.getSource("shipment-route").setData(sourceData);
        } else {
          map.addSource("shipment-route", {
            type: "geojson",
            data: sourceData,
          });

          map.addLayer({
            id: "shipment-route-line",
            type: "line",
            source: "shipment-route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#059669",
              "line-width": 5,
              "line-opacity": 0.9,
            },
          });
        }

        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1),
          minutes: Math.round(route.duration / 60),
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Mapbox route error:", error);
          setMapError(error.message || "Unable to load the route.");
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }

    drawRoute();

    return () => {
      cancelled = true;
      pickupMarker?.remove();
      deliveryMarker?.remove();
    };
  }, [valid, pickupLat, pickupLng, deliveryLat, deliveryLng]);

  return (
    <div className="w-full">
      <div
        ref={mapContainer}
        className="w-full overflow-hidden rounded-lg"
        style={{ height: "500px" }}
      />

      {routeLoading && (
        <p className="mt-2 text-sm text-slate-500">
          Loading driving route...
        </p>
      )}

      {routeInfo && (
        <p className="mt-2 text-sm text-slate-600">
          Road distance: {routeInfo.distance} km | Estimated driving time:{" "}
          {Math.floor(routeInfo.minutes / 60)} h {routeInfo.minutes % 60} min
        </p>
      )}

      {mapError && (
        <p className="mt-2 text-sm text-amber-700">{mapError}</p>
      )}
    </div>
  );
}
