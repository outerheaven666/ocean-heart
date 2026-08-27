import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

// 客户端压缩:超过 1280px 的照片先缩小,转成 JPEG(约省 80% 体积),GIF 原样上传
async function compressImage(file: File): Promise<{ mime: ImageMime; data: string }> {
  if (file.type === "image/gif") {
    const buf = await file.arrayBuffer();
    if (buf.byteLength > 420_000) throw new Error("GIF 太大了,请压到 400KB 以内再传");
    return { mime: "image/gif", data: toBase64(buf) };
  }
  const bitmap = await createImageBitmap(file);
  const MAX = 1280;
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  const base64 = dataUrl.split(",")[1];
  if (base64.length > 590_000) throw new Error("这张照片压缩后还是偏大,换一张试试?");
  return { mime: "image/jpeg", data: base64 };
}

function toBase64(buf: ArrayBuffer): string {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export default function ImageUploadButton({
  onUploaded,
  disabled,
}: {
  onUploaded: (markdown: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    try {
      for (const file of Array.from(files).slice(0, 6)) {
        const { mime, data } = await compressImage(file);
        const r = await trpc.images.upload.mutate({ mime, data });
        onUploaded(`![照片](/img/${r.id})`);
      }
    } catch (e: any) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <span className="inline-flex flex-col">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        className="inline-flex items-center gap-1.5 border border-sea-200 text-sea-700 hover:bg-sea-50 disabled:opacity-50 text-xs px-3 py-1.5 rounded-lg transition"
        title="上传照片(自动压缩,一次最多 6 张)"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
        {busy ? "上传中…" : "上传图片"}
      </button>
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </span>
  );
}
