
package com.example.imageprocessing;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

@Service
public class ImageService {

    public byte[] processImage(
            InputStream input,
            int width,
            int height,
            float quality,
            String format) throws IOException {

        ByteArrayOutputStream output =
                new ByteArrayOutputStream();

        Thumbnails.of(input)
                .size(width, height)
                .outputFormat(format)
                .outputQuality(quality)
                .toOutputStream(output);

        return output.toByteArray();
    }
}
