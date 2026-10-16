
package com.ship_track_backend.service;

import java.net.URI;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class GeocodeService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${locationiq.api-key}")
    private String apiKey;

    @SuppressWarnings("unchecked")
    public GeoCodeResult geocode(String address) {
        if (address == null || address.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Address cannot be empty."
            );
        }

        if (apiKey == null
        || apiKey.isBlank()
        || apiKey.contains("${")
        || apiKey.equalsIgnoreCase("YOUR_REAL_LOCATIONIQ_KEY")) {
    throw new ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "A valid LocationIQ API key is not configured."
    );
}
        String cleanAddress = address.trim();

        try {
            URI uri = UriComponentsBuilder
                    .fromUriString("https://us1.locationiq.com/v1/search")
                    .queryParam("key", apiKey)
                    .queryParam("q", cleanAddress)
                    .queryParam("format", "json")
                    .queryParam("countrycodes", "in")
                    .queryParam("limit", 5)
                    .build()
                    .encode()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            headers.set("User-Agent", "ShipTrackPro/1.0");

            ResponseEntity<List> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    List.class
            );

            List<Map<String, Object>> results = response.getBody();

            System.out.println(
    "LocationIQ HTTP status: " + response.getStatusCode()
);

System.out.println(
    "LocationIQ results count: " +
    (results == null ? 0 : results.size())
);

            if (results == null || results.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "No map coordinates found for: " + cleanAddress
                );
            }

            for (Map<String, Object> result : results) {
                if (result == null
                        || result.get("lat") == null
                        || result.get("lon") == null) {
                    continue;
                }

                try {
                    double latitude = Double.parseDouble(
                            result.get("lat").toString()
                    );
                    double longitude = Double.parseDouble(
                            result.get("lon").toString()
                    );

                    if (Double.isFinite(latitude)
                            && Double.isFinite(longitude)
                            && latitude >= -90 && latitude <= 90
                            && longitude >= -180 && longitude <= 180) {

                        System.out.println(
                                "Geocoded address: " + cleanAddress
                        );
                        System.out.println(
                                "Latitude: " + latitude
                        );
                        System.out.println(
                                "Longitude: " + longitude
                        );

                        return new GeoCodeResult(latitude, longitude);
                    }
                } catch (NumberFormatException ignored) {
                    // Try the next result if this result has invalid coordinates.
                }
            }

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "LocationIQ returned no valid coordinates for: "
                            + cleanAddress
            );

        } catch (ResponseStatusException e) {
            throw e;
        } catch (RestClientResponseException e) {
            System.err.println(
                    "LocationIQ HTTP status: " + e.getStatusCode()
            );
            System.err.println(
                    "LocationIQ response: " + e.getResponseBodyAsString()
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "LocationIQ could not geocode the address. Check the API key, quota, and address."
            );
        } catch (Exception e) {
            e.printStackTrace();

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Geocoding request failed: " + e.getMessage()
            );
        }
    }

    public static class GeoCodeResult {
        private final Double latitude;
        private final Double longitude;

        public GeoCodeResult(Double latitude, Double longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
        }

        public Double getLatitude() {
            return latitude;
        }

        public Double getLongitude() {
            return longitude;
        }
    }
}
