
import { useState, useRef, useEffect } from "react";
import { ImagePlus, X, LoaderCircle } from "lucide-react";
import { createWorker } from "tesseract.js";

export default function ImageUploadNotice({
  onExtract,
  onProcessingChange,
  disabled
}) {
  const fileInputRef = useRef(null);

  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const preview = image ? image.preview : "";

  // Release image preview URL
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Upload and scan image
  async function handleImageUpload(event) {
    const file = event.target.files[0];

    event.target.value = "";

    if (!file || scanning || disabled) return;

    setError("");
    setSuccess("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must not exceed 10 MB.");
      return;
    }

    setImage({
      name: file.name,
      preview: URL.createObjectURL(file)
    });

    setScanning(true);
    setProgress(0);
    onProcessingChange(true);

    let worker;

    try {
      worker = await createWorker("eng", 1, {
        logger: (info) => {
          if (info.status === "recognizing text") {
            setProgress(
              Math.round(info.progress * 100)
            );
          }
        }
      });

      const result = await worker.recognize(file);
      const extractedText = result.data.text.trim();

      if (!extractedText) {
        throw new Error(
          "No readable text was detected. Try a clearer image."
        );
      }

      onExtract(extractedText.slice(0, 5000));

      setProgress(100);

      setSuccess(
        extractedText.length > 5000
          ? "Text extracted. Only the first 5000 characters were added."
          : "Text extracted successfully. Review it before analysis."
      );

    } catch (err) {
      setError(
        err.message || "Unable to scan the image."
      );

    } finally {
      try {
        if (worker) {
          await worker.terminate();
        }
      } finally {
        setScanning(false);
        onProcessingChange(false);
      }
    }
  }

  // Remove image preview
  function handleRemoveImage() {
    setImage(null);
    setError("");
    setSuccess("");
    setProgress(0);
  }

  return (
    <div className="image-upload-wrapper">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageUpload}
        hidden
        disabled={disabled || scanning}
      />

      <button
        type="button"
        className="image-upload-button"
        onClick={() => fileInputRef.current.click()}
        disabled={disabled || scanning}
      >
        <ImagePlus size={19} />
        <span>Add image</span>
      </button>

      {image && (
        <div className="scam-attachment-card">
          <img
            src={image.preview}
            alt="Uploaded suspicious content"
            className="scam-image-preview"
          />

          <div className="scam-attachment-details">
            <strong>{image.name}</strong>

            <span>
              {scanning
                ? `Scanning image... ${progress}%`
                : "Image attached"}
            </span>
          </div>

          <button
            type="button"
            className="scam-remove-attachment"
            onClick={handleRemoveImage}
            disabled={scanning || disabled}
            aria-label="Remove image preview"
          >
            <X size={19} />
          </button>
        </div>
      )}

      {scanning && (
        <div
          className="scam-scan-status"
          role="status"
        >
          <LoaderCircle
            size={18}
            className="scam-spinner"
          />

          <span>
            Extracting text from your image...
          </span>

          <progress
            value={progress}
            max={100}
            aria-label="Image scanning progress"
          />
        </div>
      )}

      {success && (
        <p className="scam-upload-success" role="status">
          {success}
        </p>
      )}

      {error && (
        <p className="scam-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
