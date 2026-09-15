/**
 * Client-only lazy wrappers for the Mapbox components.
 * mapbox-gl touches `window` at module scope, so the map modules must never
 * be evaluated during SSR — they are dynamically imported after mount.
 */
import { Suspense, lazy, useEffect, useState, type ComponentProps, type ComponentType } from "react";

const LazyContactMap = lazy(() =>
  import("@/components/ContactMap").then((m) => ({ default: m.ContactMap })),
);
const LazyPropertyLocationMap = lazy(() =>
  import("@/components/PropertyLocationMap").then((m) => ({ default: m.PropertyLocationMap })),
);
const LazyPropertyMap = lazy(() =>
  import("@/components/PropertyMap").then((m) => ({ default: m.PropertyMap })),
);

function clientOnly<P extends object>(Comp: ComponentType<P>) {
  return function ClientOnlyMap(props: P) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) {
      return <div className="min-h-[300px] w-full animate-pulse rounded-lg bg-muted" />;
    }
    return (
      <Suspense fallback={<div className="min-h-[300px] w-full animate-pulse rounded-lg bg-muted" />}>
        <Comp {...props} />
      </Suspense>
    );
  };
}

export const ContactMap = clientOnly<ComponentProps<typeof LazyContactMap>>(LazyContactMap);
export const PropertyLocationMap = clientOnly<ComponentProps<typeof LazyPropertyLocationMap>>(
  LazyPropertyLocationMap,
);
export const PropertyMap = clientOnly<ComponentProps<typeof LazyPropertyMap>>(LazyPropertyMap);
