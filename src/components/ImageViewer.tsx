import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ImageViewer({
  src,
  alt = "Imagem",
  onClose,
}: {
  src: string | null;
  alt?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!src} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {src && (
          <img
            src={src}
            alt={alt}
            className="max-h-[85vh] w-full rounded-lg object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
