package com.ship_track_backend.service;
import com.ship_track_backend.entity.PodEntity;
import com.ship_track_backend.entity.ShipmentEntity;
import com.ship_track_backend.enums.ShipmentStatus;
import com.ship_track_backend.repository.PodRepository;
import com.ship_track_backend.repository.ShipmentRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
public class PodService {

    private final PodRepository podRepository;
    private final ShipmentRepository shipmentRepository;

    public PodService(
            PodRepository podRepository,
            ShipmentRepository shipmentRepository) {
        this.podRepository = podRepository;
        this.shipmentRepository = shipmentRepository;
    }

    public PodEntity savePod(String trackingNumber, PodEntity pod) {
        ShipmentEntity shipment = shipmentRepository
                .findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Shipment not found"));

        PodEntity existing = podRepository
                .findByShipment_TrackingNumber(trackingNumber)
                .orElse(null);

if (existing != null) {
    existing.setReceiverName(pod.getReceiverName());
    existing.setDeliveryStatus(pod.getDeliveryStatus());
    existing.setDeliveryNotes(pod.getDeliveryNotes());
    existing.setSignaturePath(pod.getSignaturePath());
    existing.setPhotoPath(pod.getPhotoPath());
    existing.setDeliveryTime(
        pod.getDeliveryTime() != null
            ? pod.getDeliveryTime()
            : LocalDateTime.now()
    );

    if ("DELIVERED".equalsIgnoreCase(existing.getDeliveryStatus())) {
        shipment.setStatus(ShipmentStatus.DELIVERED);
        shipmentRepository.save(shipment);
    }

    return podRepository.save(existing);
}


        if (pod.getReceiverName() == null
                || pod.getReceiverName().isBlank()
                || pod.getDeliveryStatus() == null
                || pod.getDeliveryStatus().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Receiver name and delivery status are required");
        }

       if ("DELIVERED".equalsIgnoreCase(pod.getDeliveryStatus())) {
    shipment.setStatus(ShipmentStatus.DELIVERED);
    shipmentRepository.save(shipment);
}
pod.setShipment(shipment);

if (pod.getDeliveryTime() == null) {
    pod.setDeliveryTime(LocalDateTime.now());
}

return podRepository.save(pod);
    }

    public PodEntity getPod(String trackingNumber) {
        return podRepository
                .findByShipment_TrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "POD not found"));
    }
}
