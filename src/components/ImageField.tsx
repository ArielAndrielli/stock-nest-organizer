import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_BYTES = 2 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export function ImageField({
  value,
  onChange,
  label = "Imagem de capa",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border">
          <img src={value} alt="Prévia" className="h-40 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow"
            aria-label="Remover imagem"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => ref.current?.click()}
          className="w-full justify-start gap-2"
        >
          <ImagePlus className="h-4 w-4" /> Selecionar imagem
        </Button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > MAX_BYTES) {
            toast.error("Imagem muito grande. Máx 2MB.");
            return;
          }
          try {
            onChange(await fileToDataUrl(f));
          } catch {
            toast.error("Falha ao carregar imagem.");
          }
        }}
      />
    </div>
  );
}
