package com.ship_track_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "proof_of_delivery")
@Getter
@Setter
public class PodEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipment_id", nullable = false, unique = true)
    private ShipmentEntity shipment;

    @Column(nullable = false)
    private String receiverName;

    @Column(nullable = false)
    private String deliveryStatus;

    @Column(length = 1000)
    private String deliveryNotes;

    private String signaturePath;

    private String photoPath;

    @Column(nullable = false)
    private LocalDateTime deliveryTime;
}
