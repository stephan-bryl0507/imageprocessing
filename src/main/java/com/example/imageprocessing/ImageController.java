
package com.example.imageprocessing;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.Locale;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final ImageService imageService;
    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    public ImageController(
            ImageService imageService,
            S3Client s3Client) {

        this.imageService = imageService;
        this.s3Client = s3Client;
    }

    @PostMapping(
        value = "/process",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<byte[]> processImage(

            @RequestParam("file") MultipartFile file,

            @RequestParam(defaultValue = "500") int width,

            @RequestParam(defaultValue = "500") int height,

            @RequestParam(defaultValue = "0.8") float quality,

            @RequestParam(defaultValue = "jpg") String format)

            throws IOException {

        // Validate uploaded file
        if (file.isEmpty() ||
                file.getSize() > 10 * 1024 * 1024) {

            return ResponseEntity.badRequest().build();
        }

        String type = file.getContentType();

        if (type == null ||
                !(type.equalsIgnoreCase("image/jpeg")
                || type.equalsIgnoreCase("image/png"))) {

            return ResponseEntity.badRequest().build();
        }

        // Validate dimensions
        if (width < 1 || width > 3000 ||
                height < 1 || height > 3000) {

            return ResponseEntity.badRequest().build();
        }

        // Validate quality
        if (quality < 0.1f || quality > 1.0f) {

            return ResponseEntity.badRequest().build();
        }

        // Validate output format
        format = format.toLowerCase(Locale.ROOT);

        if (!format.equals("jpg") &&
                !format.equals("png")) {

            return ResponseEntity.badRequest().build();
        }

        // Generate unique filename
        String uniqueId = UUID.randomUUID().toString();

        String originalExtension =
                type.equalsIgnoreCase("image/png")
                        ? "png"
                        : "jpg";

        String originalKey =
                "input/" + uniqueId + "-original." +
                originalExtension;

        String processedKey =
                "output/" + uniqueId + "-processed." +
                format;

        // Read original image
        byte[] originalImage = file.getBytes();

        // Upload original image to S3 input folder
        PutObjectRequest originalRequest =
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(originalKey)
                        .contentType(type)
                        .build();

        s3Client.putObject(
                originalRequest,
                RequestBody.fromBytes(originalImage)
        );

        // Process image using existing ImageService
        byte[] result = imageService.processImage(
                new java.io.ByteArrayInputStream(originalImage),
                width,
                height,
                quality,
                format
        );

        // Determine processed image content type
        MediaType mediaType = format.equals("png")
                ? MediaType.IMAGE_PNG
                : MediaType.IMAGE_JPEG;

        // Upload processed image to S3 output folder
        PutObjectRequest processedRequest =
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(processedKey)
                        .contentType(mediaType.toString())
                        .build();

        s3Client.putObject(
                processedRequest,
                RequestBody.fromBytes(result)
        );

        // Return processed image to React frontend
        String filename = format.equals("png")
                ? "processed.png"
                : "processed.jpg";

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(
                    "Content-Disposition",
                    "attachment; filename=\"" + filename + "\""
                )
                .body(result);
    }
}
