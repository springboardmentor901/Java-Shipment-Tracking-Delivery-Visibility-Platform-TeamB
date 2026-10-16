
package com.ship_track_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import com.ship_track_backend.entity.PodEntity;

public interface PodRepository extends JpaRepository<PodEntity, Long> {

    Optional<PodEntity> findByShipmentId(Long shipmentId);

    Optional<PodEntity> findByShipment_TrackingNumber(String trackingNumber);
}
