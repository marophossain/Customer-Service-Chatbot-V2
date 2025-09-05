import { useEffect, useRef, useState } from "react";
import styles from "./FileUpload.module.css";

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  isIndexed: boolean;
  uploadedFile: string | null;
  onReset: () => void;
}

export default function FileUpload({
  onFileUpload,
  isUploading,
  isIndexed,
  uploadedFile,
  onReset,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isUploading) {
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      return () => clearInterval(interval);
    } else {
      setUploadProgress(0);
    }
  }, [isUploading]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === "application/pdf") {
      onFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  if (isIndexed && uploadedFile) {
    return (
      <div className={styles.successState}>
        <div className={styles.successIcon}>✅</div>
        <div className={styles.successContent}>
          <h3>Document Ready</h3>
          <p>{uploadedFile}</p>
          <p className={styles.successSubtext}>
            You can now ask questions about this document
          </p>
        </div>
        <button onClick={onReset} className={styles.resetButton}>
          Upload New Document
        </button>
      </div>
    );
  }

  return (
    <div className={styles.uploadContainer}>
      <div
        className={`${styles.uploadArea} ${dragOver ? styles.dragOver : ""} ${
          isUploading ? styles.uploading : ""
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileRef.current?.click()}
      >
        <input
          type="file"
          ref={fileRef}
          accept="application/pdf"
          className={styles.fileInput}
          onChange={handleFileSelect}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className={styles.uploadingState}>
            <div className={styles.uploadIcon}>📄</div>
            <h3>Processing Document</h3>
            <p>Analyzing and indexing your PDF...</p>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className={styles.progressText}>
              {Math.round(uploadProgress)}% complete
            </p>
          </div>
        ) : (
          <div className={styles.uploadPrompt}>
            <div className={styles.uploadIcon}>📄</div>
            <h3>Upload Your PDF Document</h3>
            <p>
              <strong>Click to browse</strong> or drag and drop your PDF file
              here
            </p>
            <div className={styles.requirements}>
              <div className={styles.requirement}>
                <span className={styles.checkIcon}>✓</span>
                <span>PDF format only</span>
              </div>
              <div className={styles.requirement}>
                <span className={styles.checkIcon}>✓</span>
                <span>Maximum 10MB file size</span>
              </div>
              <div className={styles.requirement}>
                <span className={styles.checkIcon}>✓</span>
                <span>Text-based or scanned documents</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
