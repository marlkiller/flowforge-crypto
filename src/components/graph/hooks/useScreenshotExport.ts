import { useCallback, useState } from "react";
import { type ReactFlowInstance } from "@xyflow/react";
import { toCanvas } from "html-to-image";
import { toast } from "sonner";

export type ScreenshotFormat = "png" | "jpeg" | "webp";

export function useScreenshotExport(
  wrapperRef: React.RefObject<HTMLDivElement | null>,
  rf: ReactFlowInstance | null,
) {
  const [screenshotFormat, setScreenshotFormat] = useState<ScreenshotFormat>("png");
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [isShutterActive, setIsShutterActive] = useState(false);

  const captureScreenshot = useCallback(
    (fmt: ScreenshotFormat) => {
      setScreenshotFormat(fmt);
      setShowFormatPicker(false);
      if (!wrapperRef.current || !rf) return;

      const renderer = wrapperRef.current.querySelector(".react-flow") as HTMLElement | null;
      if (!renderer) return;

      const capture = async () => {
        setIsShutterActive(true);
        await new Promise((resolve) => setTimeout(resolve, 150));

        const options = {
          backgroundColor: getComputedStyle(document.body).backgroundColor || "#09090b",
          pixelRatio: 4,
          skipFonts: false,
          style: { transform: "scale(1)" },
          filter: (node: HTMLElement) => {
            const cls = node.getAttribute?.("class") || "";

            if (cls.includes("graph-toolbar")) return false;
            return !["minimap", "controls", "panel", "attribution"].some((e) =>
              cls.includes(`react-flow__${e}`),
            );
          },
        };

        try {
          const canvas = await toCanvas(renderer, options);
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(
              resolve,
              `image/${fmt === "jpeg" ? "jpeg" : fmt}`,
              fmt === "png" ? undefined : 0.95,
            ),
          );

          if (!blob) throw new Error("Capture failed");
          const dataUrl = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `flowforge-crypto-${Date.now()}.${fmt}`;
          a.click();

          setTimeout(() => URL.revokeObjectURL(dataUrl), 2000);
        } finally {
          setIsShutterActive(false);
        }
      };

      toast.promise(capture(), {
        loading: `Capturing ${fmt.toUpperCase()}...`,
        success: "Snapshot exported successfully!",
        error: "Capture failed. Try a different format.",
      });
    },
    [rf, wrapperRef],
  );

  return {
    screenshotFormat,
    showFormatPicker,
    isShutterActive,
    setShowFormatPicker,
    captureScreenshot,
  };
}
