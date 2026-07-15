import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function QrCode({ value, size = 96 }: { value: string; size?: number }) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="M"
      marginSize={1}
      className="rounded bg-white p-1"
    />
  );
}

export function Barcode({ value, height = 40, width = 1.4 }: { value: string; height?: number; width?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height,
        width,
      });
    } catch {
      // ignore
    }
  }, [value, height, width]);
  return <svg ref={ref} />;
}
