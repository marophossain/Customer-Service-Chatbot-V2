import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./App.module.css";
import { chat as chatApi, ingest as ingestApi } from "./lib/api";

type Msg = { role: "user" | "assistant"; content: string; timestamp: Date };

type UploadStage =
  | "idle"
  | "uploading"
  | "processing"
  | "chunking"
  | "embedding"
  | "indexing"
  | "complete";

export default function App() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [indexed, setIndexed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [collectionId, setCollectionId] = useState<string>("default");
  const [isTyping, setIsTyping] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Function to convert **text** to bold HTML
  const formatMessage = (content: string) => {
    // Replace **text** with <strong>text</strong>
    // Also handle line breaks properly
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br />");
    return { __html: formattedContent };
  };

  useEffect(() => {
    const sid = localStorage.getItem("session_id") || crypto.randomUUID();
    localStorage.setItem("session_id", sid);
    sessionIdRef.current = sid;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const send = async () => {
    const content = input.trim();
    if (!content || busy) return;

    const userMessage: Msg = { role: "user", content, timestamp: new Date() };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setBusy(true);
    setIsTyping(true);

    try {
      const data = await chatApi(sessionIdRef.current, content, collectionId);
      const assistantMessage: Msg = {
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
      };
      setMessages((m) => [...m, assistantMessage]);
    } catch (error) {
      const errorMessage: Msg = {
        role: "assistant",
        content:
          "❌ I'm sorry, there was an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((m) => [...m, errorMessage]);
    } finally {
      setBusy(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isPdf = (file: File) =>
    file.type === "application/pdf" ||
    file.type === "application/x-pdf" ||
    /\.pdf$/i.test(file.name);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const f = files[0];
      if (!isPdf(f)) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "⚠️ Please drop a PDF file.",
            timestamp: new Date(),
          },
        ]);
        return;
      }
      handleFileUpload(f);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const simulateUploadProgress = async () => {
    const stages: Array<{
      stage: UploadStage;
      message: string;
      duration: number;
    }> = [
      { stage: "uploading", message: "Uploading PDF file...", duration: 1000 },
      {
        stage: "processing",
        message: "Extracting text from document...",
        duration: 1500,
      },
      {
        stage: "chunking",
        message: "Breaking document into chunks...",
        duration: 1000,
      },
      {
        stage: "embedding",
        message: "Generating AI embeddings...",
        duration: 2000,
      },
      { stage: "indexing", message: "Building search index...", duration: 800 },
      {
        stage: "complete",
        message: "Document ready for questions!",
        duration: 500,
      },
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      setUploadStage(stage.stage);
      setProcessingMessage(stage.message);

      const startProgress = (i / stages.length) * 100;
      const endProgress = ((i + 1) / stages.length) * 100;

      for (let p = startProgress; p <= endProgress; p += 2) {
        setUploadProgress(Math.min(Math.round(p), 100));
        await new Promise((r) =>
          setTimeout(
            r,
            stage.duration / Math.max((endProgress - startProgress) / 2, 1)
          )
        );
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!isPdf(file)) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "⚠️ Only PDF files are supported.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // Optional 10MB size guard (matches UI text)
    if (file.size > 10 * 1024 * 1024) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "⚠️ The file exceeds the 10 MB limit.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setBusy(true);
    setUploadStage("uploading");
    setUploadProgress(0);

    try {
      // Run simulated progress + real ingest in parallel
      const progressPromise = simulateUploadProgress();
      const uploadPromise = ingestApi(file);
      const [, uploadResult] = await Promise.all([
        progressPromise,
        uploadPromise,
      ]);

      // Generate unique collection ID based on file and timestamp
      const newCollectionId = uploadResult.collection_id || `doc_${Date.now()}`;
      setCollectionId(newCollectionId);
      setIndexed(true);
      setUploadedFile(file.name);
      setUploadStage("complete");

      // Add welcome message to existing messages, don't replace them
      const welcomeMessage: Msg = {
        role: "assistant",
        content: `🎉 Perfect! I've successfully processed "${file.name}" and it's ready for analysis.\n\n✅ Text extracted and cleaned\n✅ Split into searchable chunks\n✅ Enhanced with AI embeddings\n✅ Indexed for instant retrieval\n\nYou can now ask me anything about the document content!`,
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, welcomeMessage]);
    } catch (e) {
      setUploadStage("idle");
      const errorMessage: Msg = {
        role: "assistant",
        content: `❌ I encountered an error while processing "${file.name}". This could be due to:\n\n• File format issues\n• Network connectivity\n• Document complexity\n\nPlease try uploading the document again, or contact support if the issue persists.`,
        timestamp: new Date(),
      };
      setMessages([errorMessage]);
    } finally {
      setBusy(false);
      setTimeout(() => {
        setUploadStage("idle");
        setUploadProgress(0);
        setProcessingMessage("");
      }, 1200);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brandSection}>
            <div className={styles.logo}>🤖</div>
            <div className={styles.brandText}>
              <h1 className={styles.title}>AI Document Assistant</h1>
              <p className={styles.subtitle}>
                Powered by OpenAI • Chat with your documents instantly
              </p>
            </div>
          </div>
          <div className={styles.statusIndicator}>
            <div className={`${styles.statusDot} ${styles.online}`} />
            <span className={styles.statusText}>System Online</span>
          </div>
        </div>
      </header>

      <main
        className={`${styles.chatInterface} ${
          !indexed
            ? uploadStage === "idle"
              ? styles.uploadMode
              : styles.processingMode
            : messages.length === 0
            ? styles.emptyMode
            : styles.chatMode
        }`}
      >
        {/* Upload Section - Only show when not indexed */}
        {!indexed && (
          <section
            className={`${styles.uploadSection} ${
              uploadStage === "idle"
                ? styles.uploadIdle
                : styles.uploadProcessing
            }`}
          >
            <div className={styles.uploadContainer}>
              {uploadStage === "idle" ? (
                <div
                  className={`${styles.uploadArea} ${
                    dragOver ? styles.dragOver : ""
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileRef.current?.click()}
                  role="button"
                  aria-label="Upload PDF"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      fileRef.current?.click();
                  }}
                >
                  <div className={styles.uploadIcon}>📄</div>
                  <h3 className={styles.uploadTitle}>
                    Upload Your PDF Document
                  </h3>
                  <p className={styles.uploadText}>
                    <strong>Click to browse</strong> or drag and drop your PDF
                    file here
                  </p>
                  <div className={styles.uploadRequirements}>
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
                  <input
                    type="file"
                    ref={fileRef}
                    accept="application/pdf"
                    className={styles.fileInput}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                  <button
                    className={styles.uploadButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileRef.current?.click();
                    }}
                    disabled={busy}
                  >
                    Choose File
                  </button>
                </div>
              ) : (
                <div className={styles.processingArea}>
                  <div className={styles.processingHeader}>
                    <div className={styles.processingIcon}>
                      {uploadStage === "complete" ? "✅" : "🔄"}
                    </div>
                    <h3 className={styles.processingTitle}>
                      {uploadStage === "complete"
                        ? "Processing Complete!"
                        : "Processing Document..."}
                    </h3>
                  </div>

                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className={styles.progressText}>
                      {Math.min(Math.round(uploadProgress), 100)}% complete
                    </div>
                  </div>

                  <div className={styles.processingSteps}>
                    <div
                      className={`${styles.step} ${
                        uploadStage === "uploading" || uploadProgress > 0
                          ? styles.active
                          : ""
                      } ${uploadProgress > 16 ? styles.completed : ""}`}
                    >
                      <span className={styles.stepIcon}>
                        {uploadProgress > 16 ? "✅" : "📤"}
                      </span>
                      <span>Uploading file</span>
                    </div>
                    <div
                      className={`${styles.step} ${
                        uploadStage === "processing" || uploadProgress > 16
                          ? styles.active
                          : ""
                      } ${uploadProgress > 40 ? styles.completed : ""}`}
                    >
                      <span className={styles.stepIcon}>
                        {uploadProgress > 40 ? "✅" : "📝"}
                      </span>
                      <span>Extracting text</span>
                    </div>
                    <div
                      className={`${styles.step} ${
                        uploadStage === "chunking" || uploadProgress > 40
                          ? styles.active
                          : ""
                      } ${uploadProgress > 60 ? styles.completed : ""}`}
                    >
                      <span className={styles.stepIcon}>
                        {uploadProgress > 60 ? "✅" : "✂️"}
                      </span>
                      <span>Creating chunks</span>
                    </div>
                    <div
                      className={`${styles.step} ${
                        uploadStage === "embedding" || uploadProgress > 60
                          ? styles.active
                          : ""
                      } ${uploadProgress > 85 ? styles.completed : ""}`}
                    >
                      <span className={styles.stepIcon}>
                        {uploadProgress > 85 ? "✅" : "🧠"}
                      </span>
                      <span>AI embeddings</span>
                    </div>
                    <div
                      className={`${styles.step} ${
                        uploadStage === "indexing" || uploadProgress > 85
                          ? styles.active
                          : ""
                      } ${uploadProgress > 95 ? styles.completed : ""}`}
                    >
                      <span className={styles.stepIcon}>
                        {uploadProgress > 95 ? "✅" : "🔍"}
                      </span>
                      <span>Building index</span>
                    </div>
                  </div>

                  <p className={styles.processingMessage}>
                    {processingMessage}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Messages Section - Only show when indexed */}
        {indexed && (
          <>
            <section className={styles.messagesContainer}>
              {messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>🤖</div>
                  <h3 className={styles.emptyStateTitle}>
                    Ready to Answer Your Questions!
                  </h3>
                  <p className={styles.emptyStateText}>
                    I've analyzed your document and I'm ready to help. Ask me
                    anything about the content!
                  </p>
                  <div className={styles.suggestionChips}>
                    <button
                      className={styles.suggestionChip}
                      onClick={() =>
                        setInput(
                          "What are the main topics covered in this document?"
                        )
                      }
                    >
                      📋 Main topics
                    </button>
                    <button
                      className={styles.suggestionChip}
                      onClick={() =>
                        setInput("Can you provide a summary of this document?")
                      }
                    >
                      📝 Summary
                    </button>
                    <button
                      className={styles.suggestionChip}
                      onClick={() =>
                        setInput(
                          "What are the key conclusions or recommendations?"
                        )
                      }
                    >
                      💡 Key insights
                    </button>
                  </div>
                  <div className={styles.documentInfo}>
                    <p className={styles.documentName}>📄 {uploadedFile}</p>
                    <button
                      onClick={() => {
                        // Generate new session ID for fresh start
                        const newSessionId = crypto.randomUUID();
                        localStorage.setItem("session_id", newSessionId);
                        sessionIdRef.current = newSessionId;

                        // Reset all state
                        setIndexed(false);
                        setUploadedFile(null);
                        setCollectionId("default");
                        setMessages([]);
                        setUploadStage("idle");
                        setUploadProgress(0);
                        setProcessingMessage("");
                        setInput("");
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className={styles.newDocumentButton}
                    >
                      Upload New Document
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, i) => (
                    <div
                      key={i}
                      className={`${styles.messageWrapper} ${
                        styles[message.role]
                      }`}
                    >
                      <div
                        className={`${styles.avatar} ${styles[message.role]}`}
                      >
                        {message.role === "user" ? "👤" : "🤖"}
                      </div>
                      <div className={styles.messageContainer}>
                        <div
                          className={`${styles.messageBubble} ${
                            styles[message.role]
                          }`}
                        >
                          <div className={styles.messageContent}>
                            {message.role === "assistant" ? (
                              <div
                                dangerouslySetInnerHTML={formatMessage(
                                  message.content
                                )}
                              />
                            ) : (
                              message.content
                            )}
                          </div>
                          {message.role === "assistant" && (
                            <button
                              className={styles.copyButton}
                              onClick={() =>
                                navigator.clipboard.writeText(message.content)
                              }
                              title="Copy message"
                            >
                              📋
                            </button>
                          )}
                        </div>
                        <div className={styles.messageTime}>
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div
                      className={`${styles.messageWrapper} ${styles.assistant}`}
                    >
                      <div className={`${styles.avatar} ${styles.assistant}`}>
                        🤖
                      </div>
                      <div
                        className={`${styles.messageBubble} ${styles.assistant}`}
                      >
                        <div className={styles.typing}>
                          <span>AI is thinking</span>
                          <div className={styles.typingDots}>
                            <div className={styles.typingDot} />
                            <div className={styles.typingDot} />
                            <div className={styles.typingDot} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </section>

            {/* Input Section - Only show when indexed */}
            <section className={styles.inputSection}>
              <div className={styles.inputContainer}>
                <div className={styles.inputWrapper}>
                  <textarea
                    ref={textareaRef}
                    className={styles.messageInput}
                    placeholder="Ask a question about your document..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={busy}
                    rows={1}
                    maxLength={1000}
                  />
                  <div className={styles.inputActions}>
                    <div className={styles.characterCount}>
                      <span
                        className={input.length > 800 ? styles.warning : ""}
                      >
                        {input.length}
                      </span>
                      /1000
                    </div>
                    {input.trim() && (
                      <button
                        className={styles.clearButton}
                        onClick={() => setInput("")}
                        type="button"
                        title="Clear input"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <button
                  className={styles.sendButton}
                  onClick={send}
                  disabled={busy || !input.trim()}
                  title={busy ? "Processing..." : "Send message"}
                >
                  {busy ? (
                    <div className={styles.spinner} />
                  ) : (
                    <>
                      <span>Send</span>
                      <span className={styles.sendIcon} aria-hidden>
                        ➤
                      </span>
                    </>
                  )}
                </button>
              </div>
              {!busy && (
                <div className={styles.inputHints}>
                  <span className={styles.hint}>
                    💡 Try asking: "Summarize this document" or "What are the
                    key points?"
                  </span>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4 className={styles.footerTitle}>Features</h4>
            <ul className={styles.featureList}>
              <li>🔍 Intelligent document analysis</li>
              <li>💬 Natural language Q&amp;A</li>
              <li>📊 Content summarization</li>
              <li>🚀 Instant search &amp; retrieval</li>
            </ul>
          </div>
          <div className={styles.footerSection}>
            <h4 className={styles.footerTitle}>Powered By</h4>
            <div className={styles.techStack}>
              <span className={styles.tech}>OpenAI GPT-4</span>
              <span className={styles.tech}>Vector Search</span>
              <span className={styles.tech}>FastAPI</span>
              <span className={styles.tech}>React</span>
            </div>
          </div>
          <div className={styles.footerSection}>
            <h4 className={styles.footerTitle}>Security</h4>
            <p className={styles.securityNote}>
              🔒 Your documents are processed securely and never stored
              permanently.
            </p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>
            &copy; 2025 AI Document Assistant. Built with mdmarophossain for
            productivity.
          </p>
        </div>
      </footer>
    </div>
  );
}
