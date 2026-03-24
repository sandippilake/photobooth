"use client";

import { useCallback, useRef, useState } from "react";

type Stage = "idle" | "loading-model" | "processing" | "done" | "error";

export default function BgRemoverClient() {
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showOriginal, setShowOriginal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file (PNG, JPG, WEBP).");
      setStage("error");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setOriginalUrl(objectUrl);
    setResultUrl(null);
    setShowOriginal(false);
    setStage("loading-model");
    setProgress(0);

    try {
      const { removeBackground } = await import("@imgly/background-removal");
      setStage("processing");
      const blob = await removeBackground(file, {
        progress: (_key: string, current: number, total: number) => {
          if (total > 0) setProgress(Math.round((current / total) * 100));
        },
        model: "medium",
        output: { format: "image/png", quality: 1 },
      });
      setResultUrl(URL.createObjectURL(blob));
      setStage("done");
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Background removal failed.");
      setStage("error");
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => { if (files?.length) processFile(files[0]); },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); },
    [handleFiles]
  );

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "frame-no-bg.png";
    a.click();
  };

  const reset = () => {
    setStage("idle");
    setOriginalUrl(null);
    setResultUrl(null);
    setErrorMsg("");
    setProgress(0);
    setShowOriginal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isProcessing = stage === "loading-model" || stage === "processing";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .bgr-page {
          min-height: 100vh; background: #0a0a0f; color: #f0ece4;
          font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column;
          align-items: center; padding: 48px 24px 80px; position: relative; overflow: hidden;
        }
        .bgr-blob { position: fixed; border-radius: 50%; filter: blur(120px); pointer-events: none; z-index: 0; }
        .bgr-blob-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(255,180,100,0.12) 0%, transparent 70%);
          top: -200px; left: -150px;
        }
        .bgr-blob-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(180,100,255,0.08) 0%, transparent 70%);
          bottom: -100px; right: -100px;
        }
        .bgr-content { position: relative; z-index: 1; width: 100%; max-width: 760px; display: flex; flex-direction: column; align-items: center; }
        .bgr-badge {
          font-size: 11px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase;
          color: #c8a96e; background: rgba(200,169,110,0.12); border: 1px solid rgba(200,169,110,0.25);
          padding: 5px 14px; border-radius: 100px; margin-bottom: 28px;
        }
        .bgr-headline {
          font-family: 'Playfair Display', serif; font-size: clamp(38px, 6vw, 68px);
          font-weight: 900; line-height: 1.05; text-align: center; letter-spacing: -0.02em;
          color: #f0ece4; margin-bottom: 16px;
        }
        .bgr-headline em { font-style: italic; color: #c8a96e; }
        .bgr-subhead {
          font-size: 16px; font-weight: 300; color: rgba(240,236,228,0.55);
          text-align: center; max-width: 480px; line-height: 1.6; margin-bottom: 52px;
        }

        .bgr-dropzone {
          width: 100%; border: 1.5px dashed rgba(200,169,110,0.35); border-radius: 20px;
          padding: 64px 32px; display: flex; flex-direction: column; align-items: center;
          gap: 16px; cursor: pointer; transition: border-color 0.2s, background 0.2s;
          background: rgba(255,255,255,0.02);
        }
        .bgr-dropzone:hover, .bgr-dropzone.dragging { border-color: rgba(200,169,110,0.7); background: rgba(200,169,110,0.04); }
        .bgr-drop-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: rgba(200,169,110,0.1); border: 1px solid rgba(200,169,110,0.2);
          display: flex; align-items: center; justify-content: center; font-size: 26px;
        }
        .bgr-drop-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #f0ece4; }
        .bgr-drop-sub { font-size: 14px; color: rgba(240,236,228,0.4); text-align: center; }
        .bgr-drop-btn {
          margin-top: 8px; padding: 12px 28px; background: #c8a96e; color: #0a0a0f;
          border: none; border-radius: 100px; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s, transform 0.15s;
        }
        .bgr-drop-btn:hover { background: #daba7e; transform: translateY(-1px); }

        .bgr-processing {
          width: 100%; border: 1px solid rgba(200,169,110,0.2); border-radius: 20px;
          padding: 48px 32px; display: flex; flex-direction: column;
          align-items: center; gap: 24px; background: rgba(255,255,255,0.02);
        }
        .bgr-spinner {
          width: 64px; height: 64px; border-radius: 50%;
          border: 3px solid rgba(200,169,110,0.15); border-top-color: #c8a96e;
          animation: bgr-spin 0.9s linear infinite;
        }
        @keyframes bgr-spin { to { transform: rotate(360deg); } }
        .bgr-proc-label { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #f0ece4; }
        .bgr-proc-sub { font-size: 13px; color: rgba(240,236,228,0.4); text-align: center; max-width: 340px; line-height: 1.6; }
        .bgr-prog-track { width: 100%; max-width: 320px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden; }
        .bgr-prog-fill { height: 100%; background: linear-gradient(90deg, #c8a96e, #e8c98e); border-radius: 100px; transition: width 0.3s ease; }
        .bgr-prog-pct { font-size: 13px; color: rgba(200,169,110,0.8); font-weight: 500; }

        .bgr-result { width: 100%; display: flex; flex-direction: column; gap: 28px; }
        .bgr-compare {
          width: 100%; border-radius: 20px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08); position: relative;
          background: repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%) 0 0 / 24px 24px;
        }
        .bgr-compare-img { width: 100%; display: block; max-height: 520px; object-fit: contain; }
        .bgr-toggle-row {
          position: absolute; top: 14px; right: 14px; display: flex;
          background: rgba(10,10,15,0.7); backdrop-filter: blur(8px);
          border-radius: 100px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;
        }
        .bgr-toggle-btn {
          padding: 7px 16px; font-size: 12px; font-weight: 500; cursor: pointer;
          border: none; background: transparent; color: rgba(240,236,228,0.5);
          font-family: 'DM Sans', sans-serif; transition: background 0.15s, color 0.15s;
        }
        .bgr-toggle-btn.active { background: #c8a96e; color: #0a0a0f; }
        .bgr-tip {
          display: flex; align-items: center; gap: 10px; padding: 14px 18px;
          background: rgba(200,169,110,0.07); border: 1px solid rgba(200,169,110,0.18);
          border-radius: 12px; font-size: 13px; color: rgba(200,169,110,0.85); line-height: 1.5;
        }
        .bgr-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .bgr-btn-primary {
          flex: 1; padding: 15px 24px; background: #c8a96e; color: #0a0a0f;
          border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 500; cursor: pointer; transition: background 0.2s, transform 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px; min-width: 180px;
        }
        .bgr-btn-primary:hover { background: #daba7e; transform: translateY(-1px); }
        .bgr-btn-ghost {
          padding: 15px 24px; background: rgba(255,255,255,0.05); color: rgba(240,236,228,0.7);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
          font-family: 'DM Sans', sans-serif; font-size: 15px; cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .bgr-btn-ghost:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.2); }

        .bgr-error {
          width: 100%; padding: 32px; border: 1px solid rgba(255,100,100,0.3);
          background: rgba(255,60,60,0.05); border-radius: 20px;
          display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center;
        }
        .bgr-error-title { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #ff8080; }
        .bgr-error-msg { font-size: 14px; color: rgba(240,236,228,0.5); max-width: 380px; }

        .bgr-footer { margin-top: 80px; font-size: 12px; color: rgba(240,236,228,0.2); text-align: center; line-height: 1.7; }
        .bgr-footer a { color: rgba(200,169,110,0.5); text-decoration: none; }
        .bgr-footer a:hover { color: #c8a96e; }
      `}</style>

      <div className="bgr-page">
        <div className="bgr-blob bgr-blob-1" />
        <div className="bgr-blob bgr-blob-2" />
        <div className="bgr-content">
          <span className="bgr-badge">Free Tool · No Login Required</span>
          <h1 className="bgr-headline">Remove <em>Backgrounds</em><br />from Frame PNGs</h1>
          <p className="bgr-subhead">
            Upload your photobooth frame artwork and we&apos;ll strip the background
            in seconds — entirely in your browser, nothing sent to any server.
          </p>

          {stage === "idle" && (
            <div
              className={`bgr-dropzone${dragging ? " dragging" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="bgr-drop-icon">🖼️</div>
              <p className="bgr-drop-title">Drop your frame here</p>
              <p className="bgr-drop-sub">PNG · JPG · WEBP · up to ~20 MB<br />Works best on frames with solid or near-solid backgrounds</p>
              <button className="bgr-drop-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Choose File
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
            </div>
          )}

          {isProcessing && (
            <div className="bgr-processing">
              <div className="bgr-spinner" />
              <p className="bgr-proc-label">{stage === "loading-model" ? "Loading AI model…" : "Removing background…"}</p>
              <p className="bgr-proc-sub">
                {stage === "loading-model"
                  ? "Downloading the WASM model (~40 MB on first run). Cached after this."
                  : "The AI is carefully cutting around every edge of your frame."}
              </p>
              {stage === "processing" && progress > 0 && (
                <>
                  <div className="bgr-prog-track"><div className="bgr-prog-fill" style={{ width: `${progress}%` }} /></div>
                  <span className="bgr-prog-pct">{progress}%</span>
                </>
              )}
            </div>
          )}

          {stage === "done" && resultUrl && (
            <div className="bgr-result">
              <div className="bgr-compare">
                <img className="bgr-compare-img" src={showOriginal ? (originalUrl ?? "") : resultUrl} alt={showOriginal ? "Original" : "Background removed"} />
                <div className="bgr-toggle-row">
                  <button className={`bgr-toggle-btn${!showOriginal ? " active" : ""}`} onClick={() => setShowOriginal(false)}>Result</button>
                  <button className={`bgr-toggle-btn${showOriginal ? " active" : ""}`} onClick={() => setShowOriginal(true)}>Original</button>
                </div>
              </div>
              <div className="bgr-tip">
                <span>💡</span>
                <span>The checkerboard pattern means <strong>transparent</strong> — ready to layer over any photo.</span>
              </div>
              <div className="bgr-actions">
                <button className="bgr-btn-primary" onClick={handleDownload}>⬇ Download PNG</button>
                <button className="bgr-btn-ghost" onClick={reset}>Try Another</button>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="bgr-error">
              <span style={{ fontSize: 32 }}>⚠️</span>
              <p className="bgr-error-title">Something went wrong</p>
              <p className="bgr-error-msg">{errorMsg || "Unknown error. Please try a different image."}</p>
              <button className="bgr-btn-ghost" onClick={reset}>Try Again</button>
            </div>
          )}

          <div className="bgr-footer">
            Powered by <a href="https://img.ly/showcases/cesdk/background-removal/web" target="_blank" rel="noreferrer">@imgly/background-removal</a>
            {" "}· Runs 100% in your browser · No image is ever uploaded to a server<br />
            <a href="/">← Back to PhotoBooth</a>
          </div>
        </div>
      </div>
    </>
  );
}
