import { useMemo, useRef, useState } from "react";
import { createQrCode } from "../qr";

interface Props {
  /** 共有URL(共有ボタンで生成したもの)。 */
  url: string;
  onClose: () => void;
}

const MONO = "IBM Plex Mono, monospace";

/**
 * 共有URLをQRコードで見せるオーバーレイ。
 * - QRは常に白地・黒モジュール(テーマが暗くても反転させない。反転QRは読めない端末がある)
 * - QRが容量超過のときはURLコピーだけを案内する
 */
export function ShareDialog({ url, onClose }: Props) {
  const qr = useMemo(() => createQrCode(url), [url]);
  // Idle: 未コピー / copied: クリップボードへ書けた / manual: 書けないので選択状態にした
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const [zoomed, setZoomed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const copy = () => {
    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) {
      // 非セキュアコンテキストではクリップボードが無いので、選択状態にして手動コピーさせる
      inputRef.current?.select();
      setCopyState("manual");
      return;
    }
    clipboard.writeText(url).then(
      () => setCopyState("copied"),
      () => {
        inputRef.current?.select();
        setCopyState("manual");
      },
    );
  };

  const copyLabel =
    copyState === "copied"
      ? "コピーしました"
      : copyState === "manual"
        ? "選択しました"
        : "URLをコピー";

  return (
    <>
      <div
        style={{
          alignItems: "center",
          background: "rgba(0,0,0,0.4)",
          bottom: 0,
          display: "flex",
          justifyContent: "center",
          left: 0,
          position: "fixed",
          right: 0,
          top: 0,
          zIndex: 100,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "var(--paper)",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            maxHeight: "90vh",
            maxWidth: "90vw",
            overflowY: "auto",
            padding: "20px",
            width: "360px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontFamily: MONO, fontSize: "13px", textAlign: "center" }}>
            間取りを共有
          </div>

          {qr ? (
            <>
              <div
                title="タップで拡大"
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  cursor: "zoom-in",
                  padding: "8px",
                }}
                onClick={() => setZoomed(true)}
              >
                <svg
                  aria-label="間取りを共有するQRコード"
                  role="img"
                  shapeRendering="crispEdges"
                  style={{ aspectRatio: "1 / 1", display: "block", width: "100%" }}
                  viewBox={`0 0 ${qr.size} ${qr.size}`}
                >
                  <rect fill="#ffffff" height={qr.size} width={qr.size} x={0} y={0} />
                  <path d={qr.path} fill="#000000" />
                </svg>
              </div>
              <div
                style={{
                  color: "var(--ink)",
                  fontFamily: MONO,
                  fontSize: "11px",
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                スマホのカメラで読み取ると、この間取りが開きます(タップで拡大)
              </div>
            </>
          ) : (
            <div style={{ fontFamily: MONO, fontSize: "12px", lineHeight: 1.6 }}>
              間取りが大きすぎてQRコードに収まりません。下のURLをコピーして送ってください。
            </div>
          )}

          <input
            readOnly
            ref={inputRef}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "4px",
              fontFamily: MONO,
              fontSize: "11px",
              padding: "6px 8px",
              width: "100%",
            }}
            value={url}
            onFocus={(e) => e.target.select()}
          />

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={copy}
              style={{
                background: "var(--ink)",
                border: "none",
                borderRadius: "4px",
                color: "var(--paper)",
                cursor: "pointer",
                flex: 1,
                fontFamily: MONO,
                fontSize: "12px",
                minHeight: "36px",
                padding: "6px 0",
              }}
            >
              {copyLabel}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                color: "var(--ink)",
                cursor: "pointer",
                fontFamily: MONO,
                fontSize: "12px",
                minHeight: "36px",
                minWidth: "72px",
                padding: "6px 12px",
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>

      {qr && zoomed && (
        <div
          style={{
            alignItems: "center",
            background: "#ffffff",
            bottom: 0,
            cursor: "zoom-out",
            display: "flex",
            justifyContent: "center",
            left: 0,
            position: "fixed",
            right: 0,
            top: 0,
            zIndex: 110,
          }}
          onClick={() => setZoomed(false)}
        >
          <svg
            aria-label="間取りを共有するQRコード(拡大)"
            role="img"
            shapeRendering="crispEdges"
            style={{ display: "block", height: "min(92vw, 92vh)", width: "min(92vw, 92vh)" }}
            viewBox={`0 0 ${qr.size} ${qr.size}`}
          >
            <rect fill="#ffffff" height={qr.size} width={qr.size} x={0} y={0} />
            <path d={qr.path} fill="#000000" />
          </svg>
        </div>
      )}
    </>
  );
}
