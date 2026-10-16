
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function MapboxTest() {
  const mapContainer = useRef(null);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    if (!token) {
      console.error("Mapbox token is missing. Check your .env file.");
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [85.8245, 20.2961],
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl());

    return () => map.remove();
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: "450px" }}
    />
  );
}
