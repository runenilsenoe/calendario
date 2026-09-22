import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Maximize2 } from "lucide-react";

type TransformState = {
  scale: number;
  positionX: number;
  positionY: number;
};

/**
 * Renders a fixed-size poster scaled to fit the container, with
 * wheel/pinch zoom and drag panning.
 *
 * On desktop the default view fits the whole poster inside the viewport
 * (both height and width). On narrow/mobile screens it fits to width.
 * Panning is constrained so the poster can never be dragged out of view,
 * and dragging is only enabled when zoomed in beyond the default scale.
 */
export function ZoomStage({
  children,
  measureKey,
}: {
  children: ReactNode;
  /** Changes when the poster content changes, to re-measure. */
  measureKey?: string | number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [container, setContainer] = useState({ width: 0, height: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    positionX: 0,
    positionY: 0,
  });

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () =>
      setContainer({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = contentRef.current?.firstElementChild as HTMLElement | null;
    if (!el) return;
    const measure = () =>
      setSize({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureKey]);

  const fitWidth =
    size.width > 0 && container.width > 0 ? container.width / size.width : 1;
  const fitHeight =
    size.height > 0 && container.height > 0 ? container.height / size.height : 1;

  // Always fit the whole poster inside the available area so nothing is
  // cut off at the bottom. Users zoom in to read details.
  const fit = Math.min(fitWidth, fitHeight);

  const stageHeight = container.height > 0 ? container.height : 360;


  // Dragging is only allowed when the user has zoomed in beyond the
  // default fit scale.
  const isZoomedIn = transform.scale > fit + 0.01;
  const panDisabled = !isZoomedIn;

  const fitToView = (animate = true) => {
    const x = (container.width - size.width * fit) / 2;
    const y = (container.height - size.height * fit) / 2;
    apiRef.current?.setTransform(x, y, fit, animate ? 200 : 0);
  };

  useEffect(() => {
    if (size.width > 0 && container.width > 0) fitToView(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, measureKey]);

  const minScale = size.width > 0 && container.width > 0 ? fit : 0.05;
  const atMinScale = transform.scale <= minScale + 0.001;

  return (
    <div
      ref={outerRef}
      className="relative h-[calc(100vh-12rem)] min-h-[360px] overflow-hidden rounded-2xl border border-border bg-card md:h-[calc(100vh-10rem)]"
    >
      <div className="absolute bottom-3 right-3 z-10 flex gap-1 rounded-full border border-border bg-background/90 p-1 backdrop-blur">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={atMinScale}
          onClick={() => apiRef.current?.zoomOut(0.3)}
          aria-label="Zoom ut"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => apiRef.current?.zoomIn(0.3)}
          aria-label="Zoom inn"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => fitToView()}
          aria-label="Tilpass skjermen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <TransformWrapper
        ref={apiRef}
        initialScale={1}
        minScale={minScale}
        maxScale={6}
        limitToBounds={true}
        centerZoomedOut={true}
        doubleClick={{ disabled: true }}
        wheel={{ step: 0.15, wheelDisabled: true, touchPadDisabled: false }}
        pinch={{ step: 5 }}
        panning={{ velocityDisabled: true, disabled: panDisabled }}
        onTransform={(_ref, state) => setTransform(state)}
      >
        <TransformComponent
          wrapperStyle={{
            width: "100%",
            height: stageHeight,
            cursor: panDisabled ? "default" : "grab",
          }}
          contentStyle={{
            width: size.width || undefined,
            height: size.height || undefined,
          }}
        >
          <div ref={contentRef} style={{ display: "inline-block" }}>
            {children}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
