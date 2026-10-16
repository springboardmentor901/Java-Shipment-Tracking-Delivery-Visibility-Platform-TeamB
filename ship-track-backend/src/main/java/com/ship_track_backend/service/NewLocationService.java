
package com.ship_track_backend.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

@Service
public class NewLocationService {

    private final GeocodeService geocodeService;

    public NewLocationService(GeocodeService geocodeService) {
        this.geocodeService = geocodeService;
    }

    public Map<String, Double> convertLocationToCoordinates(
            String newLocation) {

        GeocodeService.GeoCodeResult result =
                geocodeService.geocode(newLocation);

        Map<String, Double> coordinates = new HashMap<>();
        coordinates.put("latitude", result.getLatitude());
        coordinates.put("longitude", result.getLongitude());

        return coordinates;
    }
}
