
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";

const API_BASE_URL = "http://localhost:8080";

const PODForm = ({ trackingNumber, onSubmit }) => {
  const signatureRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState(
    "Package delivered successfully"
  );
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return undefined;
    }

    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch((error) => {
      console.error("Camera preview error:", error);
      setCameraError("Unable to start the camera preview.");
    });
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
  };

  const openCamera = async () => {
    try {
      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access requires localhost or HTTPS.");
      }

      closeCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      setCameraError(
        error.name === "NotAllowedError"
          ? "Please allow camera access in your browser."
          : error.message || "Unable to open camera."
      );
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is not ready. Please wait.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Unable to capture photo.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Unable to capture photo. Please try again.");
          return;
        }

        setPhoto(
          new File([blob], "delivered-parcel.jpg", {
            type: "image/jpeg",
          })
        );
        closeCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCameraError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    setCameraError("");
    setPhoto(file);
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    const currentTrackingNumber = String(trackingNumber ?? "").trim();

    if (!currentTrackingNumber) {
      alert("Tracking number is missing. Open a valid shipment.");
      return;
    }

    if (!photo) {
      alert("Please capture or select a parcel photo.");
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      alert("Please collect the receiver's signature.");
      return;
    }

    if (!receiverName.trim()) {
      alert("Please enter the receiver's name.");
      return;
    }

    setSubmitting(true);

    try {
      const signatureCanvas = signatureRef.current.getCanvas();
      const signatureData = signatureCanvas.toDataURL("image/png");

      const signatureBlob = await new Promise((resolve, reject) => {
        signatureCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not process the signature."));
        }, "image/png");
      });

      const photoData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read the photo."));
        reader.readAsDataURL(photo);
      });

      const formData = new FormData();
      formData.append("photo", photo);
      formData.append("signature", signatureBlob, "signature.png");
      formData.append("receiverName", receiverName.trim());
      formData.append("deliveryNotes", deliveryNotes.trim());

      const response = await fetch(
        `${API_BASE_URL}/api/pod/${encodeURIComponent(
          currentTrackingNumber
        )}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `POD upload failed (${response.status}).`);
      }

      const savedPod = await response.json();

      // Create a PDF for this shipment.
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      pdf.setFontSize(18);
      pdf.text("Proof of Delivery", margin, 20);

      pdf.setFontSize(11);
      pdf.text(`Tracking Number: ${currentTrackingNumber}`, margin, 35);
      pdf.text(`Receiver Name: ${receiverName.trim()}`, margin, 45);
      pdf.text(`Date: ${new Date().toLocaleString()}`, margin, 55);

      pdf.text("Delivery Notes:", margin, 67);

      const noteLines = pdf.splitTextToSize(
        deliveryNotes.trim() || "No delivery notes",
        contentWidth
      );

      pdf.text(noteLines, margin, 74);

      let y = 74 + noteLines.length * 6 + 8;

      if (y + 100 > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }

      pdf.text("Delivered Parcel Photo", margin, y);
      y += 5;

      const imageFormat = photo.type === "image/png" ? "PNG" : "JPEG";
      const imageInfo = pdf.getImageProperties(photoData);
      const ratio = imageInfo.width / imageInfo.height;

      let imageWidth = Math.min(contentWidth, 110);
      let imageHeight = imageWidth / ratio;

      if (imageHeight > 70) {
        imageHeight = 70;
        imageWidth = imageHeight * ratio;
      }

      pdf.addImage(
        photoData,
        imageFormat,
        margin,
        y,
        imageWidth,
        imageHeight
      );

      y += imageHeight + 12;

      if (y + 45 > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }

      pdf.text("Receiver Signature", margin, y);
      pdf.addImage(signatureData, "PNG", margin, y + 5, 100, 30);

      pdf.save(`POD-${currentTrackingNumber}.pdf`);

      if (onSubmit) {
        await onSubmit(savedPod);
      }

      alert(`POD saved successfully for ${currentTrackingNumber}.`);

      setPhoto(null);
      setReceiverName("");
      setDeliveryNotes("Package delivered successfully");
      signatureRef.current?.clear();
    } catch (error) {
      console.error("POD submission failed:", error);
      alert(`Failed to save POD: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-3xl space-y-6 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Proof of Delivery
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Tracking number: {trackingNumber || "Not selected"}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">
          1. Delivered parcel photo
        </h3>

        {!cameraOpen ? (
          <button
            type="button"
            onClick={openCamera}
            className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white"
          >
            Open Camera
          </button>
        ) : (
          <div className="space-y-3">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="max-h-96 w-full rounded-lg bg-black"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={takePhoto}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-white"
              >
                Take Photo
              </button>

              <button
                type="button"
                onClick={closeCamera}
                className="rounded-lg border px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {cameraError && (
          <p className="text-sm text-red-600">{cameraError}</p>
        )}

        <label className="block text-sm text-slate-600">
          Or select a photo from your device
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="mt-2 block w-full rounded-lg border p-2"
          />
        </label>

        {photoPreview && (
          <div className="space-y-2">
            <img
              src={photoPreview}
              alt="Delivered parcel preview"
              className="max-h-72 rounded-lg border object-contain"
            />

            <p className="text-sm text-green-700">
              Photo selected: {photo?.name}
            </p>

            <button
              type="button"
              onClick={openCamera}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Retake Photo
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">
          2. Receiver signature
        </h3>

        <p className="text-sm text-slate-500">
          Ask the receiver to sign below using a finger or mouse.
        </p>

        <div className="overflow-hidden rounded-lg border border-slate-300">
          <SignatureCanvas
            ref={signatureRef}
            penColor="black"
            canvasProps={{
              width: 650,
              height: 200,
              className: "w-full bg-white",
              "aria-label": "Receiver signature canvas",
            }}
          />
        </div>

        <button
          type="button"
          onClick={clearSignature}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Clear signature
        </button>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="receiverName"
          className="block font-semibold text-slate-800"
        >
          Receiver name
        </label>

        <input
          id="receiverName"
          value={receiverName}
          onChange={(event) => setReceiverName(event.target.value)}
          placeholder="Enter receiver's full name"
          className="w-full rounded-lg border p-3"
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="deliveryNotes"
          className="block font-semibold text-slate-800"
        >
          Delivery notes
        </label>

        <textarea
          id="deliveryNotes"
          value={deliveryNotes}
          onChange={(event) => setDeliveryNotes(event.target.value)}
          className="w-full rounded-lg border p-3"
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Saving POD..." : "Confirm Delivery"}
      </button>
    </form>
  );
};

export default PODForm;
