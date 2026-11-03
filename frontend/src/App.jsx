import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(500);
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState("jpg");
  const [preview, setPreview] = useState("");
  const [processedUrl, setProcessedUrl] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [processedSize, setProcessedSize] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    };
  }, [preview, processedUrl]);

  function selectFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!["image/jpeg", "image/png"].includes(selected.type)) {
      setMessage("Please select a JPG or PNG image.");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setMessage("Please select an image under 10 MB.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setOriginalSize(selected.size);
    setProcessedUrl("");
    setProcessedSize(0);
    setMessage("Image selected successfully.");
  }

  async function processImage() {
    if (!file) {
      setMessage("Please choose an image first.");
      return;
    }

    if (
      !Number.isInteger(Number(width)) ||
      !Number.isInteger(Number(height)) ||
      width < 1 || width > 3000 ||
      height < 1 || height > 3000
    ) {
      setMessage("Width and height must be between 1 and 3000.");
      return;
    }

    const data = new FormData();
    data.append("file", file);
    data.append("width", width);
    data.append("height", height);
    data.append("quality", quality);
    data.append("format", format);

    setLoading(true);
    setMessage("Processing image...");

    try {
      const response = await fetch(
        "http://localhost:8080/api/images/process",
        { method: "POST", body: data }
      );

      if (!response.ok) {
        throw new Error(
          `Processing failed (HTTP ${response.status}). Check your inputs.`
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setProcessedUrl(url);
      setProcessedSize(blob.size);
      setMessage("Image processed successfully!");
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? "Cannot connect to the backend. Check Spring Boot and CORS."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadImage() {
    if (!processedUrl) return;

    const link = document.createElement("a");
    link.href = processedUrl;
    link.download = `processed.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function formatSize(bytes) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return (
    <main className="container">
      <span className="badge">Player 1 Ready</span>
      <h1>Serverless Image Processing</h1>
      <p className="subtitle">Upload, resize, compress and preview your images.</p>

      <label>
        Choose an image
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={selectFile}
        />
      </label>

      <div className="image-grid">
        {preview && (
          <section className="image-card">
            <h2>Original Image</h2>
            <img src={preview} alt="Original upload" />
            <p>Size: {formatSize(originalSize)}</p>
          </section>
        )}

        {processedUrl && (
          <section className="image-card">
            <h2>Processed Image</h2>
            <img src={processedUrl} alt="Processed result" />
            <p>Size: {formatSize(processedSize)}</p>
            <p>
              {processedSize < originalSize
                ? `Reduced by ${(
                    ((originalSize - processedSize) / originalSize) * 100
                  ).toFixed(1)}%`
                : processedSize > originalSize
                ? "The processed file is larger than the original."
                : "The file size is unchanged."}
            </p>
          </section>
        )}
      </div>

      <div className="controls">
        <label>
          Width (pixels)
          <input
            type="number"
            min="1"
            max="3000"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
        </label>

        <label>
          Height (pixels)
          <input
            type="number"
            min="1"
            max="3000"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </label>

        <label>
          Quality: {Math.round(quality * 100)}%
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
          />
        </label>

        <label>
          Output format
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="jpg">JPEG</option>
            <option value="png">PNG</option>
          </select>
        </label>
      </div>

      <button onClick={processImage} disabled={loading}>
        {loading ? "Processing..." : "▶ Process Image"}
      </button>

      {processedUrl && (
        <button className="download-button" onClick={downloadImage}>
          ⬇ Download Processed Image
        </button>
      )}

      <p className="status" role="status">{message}</p>
    </main>
  );
}

export default App;