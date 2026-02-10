"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Hook for optimistic navigation
export function useOptimisticNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = useCallback(
    (href: string) => {
      // Start navigation immediately
      router.prefetch(href);

      // Use transition for smoother UX
      if ("startViewTransition" in document) {
        (
          document as Document & {
            startViewTransition?: (callback: () => void) => void;
          }
        ).startViewTransition(() => {
          router.push(href);
        });
      } else {
        router.push(href);
      }
    },
    [router],
  );

  return { navigate, pathname };
}

// Hook for intersection observer (lazy loading)
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit,
) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          // Element is visible
          ref.current?.classList.add("visible");
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
        ...options,
      },
    );

    observerRef.current.observe(ref.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [ref, options]);
}

// Hook for prefetching on hover
export function usePrefetchOnHover(href: string) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      router.prefetch(href);
    }, 100);
  }, [router, href]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { handleMouseEnter, handleMouseLeave };
}

// Hook for offline detection
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    const startMark = `${componentName}-mount-start`;
    const endMark = `${componentName}-mount-end`;

    performance.mark(startMark);

    return () => {
      performance.mark(endMark);
      performance.measure(`${componentName} Mount Time`, startMark, endMark);
    };
  }, [componentName]);
}
