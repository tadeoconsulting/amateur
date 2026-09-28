"use client";

import { useRef, useState } from "react";

const VIEW = 280; // tamaño del recorte visible en pantalla (px)
const OUTPUT = 512; // tamaño de la imagen final (px)

/**
 * Elegir una imagen y encuadrarla en un círculo (arrastrar para mover, control para el zoom).
 * Devuelve el recorte como PNG cuadrado por `onCropped`; no sube nada — quien la usa decide a
 * dónde mandar el archivo (ver `_lib/upload-avatar.ts`).
 */
export function AvatarCropper({
  open,
  onClose,
  onCropped,
}: {
  open: boolean;
  onClose: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  function reset() {
    setImageUrl(null);
    imgRef.current = null;
    setNaturalSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNaturalSize({ width: img.width, height: img.height });
      setImageUrl(url);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
    });
  }
  function handlePointerUp() {
    dragRef.current = null;
  }

  function confirmCrop() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // La imagen cubre el círculo entero (como object-fit: cover), multiplicado por el zoom.
    const baseScale = Math.max(VIEW / img.width, VIEW / img.height);
    const scale = baseScale * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const outputScale = OUTPUT / VIEW;

    ctx.save();
    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      img,
      (VIEW / 2 - drawW / 2 + offset.x) * outputScale,
      (VIEW / 2 - drawH / 2 + offset.y) * outputScale,
      drawW * outputScale,
      drawH * outputScale
    );
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        onCropped(blob);
        reset();
      }
    }, "image/png", 0.92);
  }

  if (!open) return null;

  const previewSize = naturalSize
    ? {
        width: naturalSize.width * Math.max(VIEW / naturalSize.width, VIEW / naturalSize.height) * zoom,
        height: naturalSize.height * Math.max(VIEW / naturalSize.width, VIEW / naturalSize.height) * zoom,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5">
        <h2 className="mb-4 text-center font-heading text-lg font-bold text-text-primary">Foto de perfil</h2>

        {!imageUrl ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-lg bg-brand-900 px-5 py-3 font-heading text-sm font-semibold text-white"
            >
              Elegir imagen
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        ) : (
          <>
            <div
              className="relative mx-auto touch-none overflow-hidden rounded-full bg-black/5"
              style={{ width: VIEW, height: VIEW, cursor: "grab" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- recorte con canvas, no un <Image> optimizado */}
              <img
                src={imageUrl}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                  width: previewSize?.width,
                  height: previewSize?.height,
                  maxWidth: "none",
                }}
              />
            </div>

            <div className="mt-4 flex items-center gap-3 px-2">
              <span className="font-body text-xs text-text-secondary">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={reset}
                className="flex-1 cursor-pointer rounded-lg border border-border-primary py-2.5 font-heading text-sm font-semibold text-text-primary"
              >
                Elegir otra
              </button>
              <button
                onClick={confirmCrop}
                className="flex-1 cursor-pointer rounded-lg bg-brand-900 py-2.5 font-heading text-sm font-semibold text-white"
              >
                Usar esta foto
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => { reset(); onClose(); }}
          className="mt-4 w-full cursor-pointer text-center font-body text-sm text-text-secondary underline"
        >
          Cancelar
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
