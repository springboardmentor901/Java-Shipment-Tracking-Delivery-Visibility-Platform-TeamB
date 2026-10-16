package com.ship_track_backend.controller;

import com.ship_track_backend.service.PodService;
import com.ship_track_backend.entity.PodEntity;

import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import java.net.MalformedURLException;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@RestController
@RequestMapping("/api/pod")
@CrossOrigin(origins = "*")
public class PodController {

    private final PodService podService;

    public PodController(PodService podService) {
        this.podService = podService;
    }

    @PostMapping("/{trackingNumber}")
    public ResponseEntity<PodEntity> savePod(
            @PathVariable String trackingNumber,
            @RequestBody PodEntity pod) {

        return ResponseEntity.ok(
                podService.savePod(trackingNumber, pod)
        );
    }

    @GetMapping("/{trackingNumber}")
    public ResponseEntity<PodEntity> getPod(
            @PathVariable String trackingNumber) {

        return ResponseEntity.ok(
                podService.getPod(trackingNumber)
        );
    }
    
@PostMapping(
    value = "/{trackingNumber}/upload",
    consumes = MediaType.MULTIPART_FORM_DATA_VALUE
)
public ResponseEntity<?> uploadPod(
        @PathVariable String trackingNumber,
        @RequestParam("photo") MultipartFile photo,
        @RequestParam("signature") MultipartFile signature) {

    try {
        Path uploadDir = Paths.get("uploads", "pod");
        Files.createDirectories(uploadDir);

        String photoName = UUID.randomUUID() + "_" +
                photo.getOriginalFilename();
        String signatureName = UUID.randomUUID() + "_" +
                signature.getOriginalFilename();

       Path absoluteUploadDir = uploadDir.toAbsolutePath().normalize();
Files.createDirectories(absoluteUploadDir);

Path photoPath = absoluteUploadDir.resolve(photoName).normalize();
Path signaturePath = absoluteUploadDir.resolve(signatureName).normalize();

if (!photoPath.startsWith(absoluteUploadDir)
        || !signaturePath.startsWith(absoluteUploadDir)) {
    return ResponseEntity.badRequest().body("Invalid file path");
}

        Files.copy(photo.getInputStream(), photoPath,
                StandardCopyOption.REPLACE_EXISTING);
        Files.copy(signature.getInputStream(), signaturePath,
                StandardCopyOption.REPLACE_EXISTING);

                PodEntity pod = podService.getPod(trackingNumber);
pod.setPhotoPath(photoPath.toString());
pod.setSignaturePath(signaturePath.toString());

            PodEntity savedPod = podService.savePod(trackingNumber, pod);

            return ResponseEntity.ok(savedPod);

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body("Failed to upload POD files");
        }
    }
    
@GetMapping("/files/{filename:.+}")
public ResponseEntity<Resource> getPodFile(
        @PathVariable String filename) {

    try {
        Path uploadDir = Paths.get("uploads", "pod")
                .toAbsolutePath()
                .normalize();

        Path filePath = uploadDir.resolve(filename)
                .normalize();

        // Prevent access outside uploads/pod
        if (!filePath.startsWith(uploadDir)
                || !Files.isRegularFile(filePath)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(filePath.toUri());

        String contentType = Files.probeContentType(filePath);
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(
                    HttpHeaders.CONTENT_DISPOSITION,
                    "inline; filename=\"" + filePath.getFileName() + "\""
                )
                .body(resource);

    } catch (IOException e) {
        return ResponseEntity.internalServerError().build();
    }
}


}

