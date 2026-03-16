import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "../../hooks/use-mobile";

describe("useIsMobile", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return false when window width is >= 768px", () => {
        Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);
    });

    it("should return true when window width is < 768px", () => {
        Object.defineProperty(window, "innerWidth", { writable: true, value: 375 });

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(true);
    });

    it("should update when matchMedia triggers a change", () => {
        let changeListener: (() => void) | null = null;

        Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });
        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn().mockImplementation((_: string, cb: () => void) => {
                    changeListener = cb;
                }),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);

        // Simulate mobile change
        act(() => {
            Object.defineProperty(window, "innerWidth", { writable: true, value: 360 });
            changeListener?.();
        });

        expect(result.current).toBe(true);
    });
});
