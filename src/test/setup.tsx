import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock @tanstack/react-virtual to render ALL items in tests (no actual virtualization)
// JSDOM doesn't compute CSS sizes, so the virtualizer's async measurement/render breaks tests
vi.mock('@tanstack/react-virtual', () => {
    function useVirtualizer({ count, estimateSize, getItemKey }: {
        count: number;
        estimateSize: number | ((index: number) => number);
        getItemKey?: (index: number) => string | number;
    }) {
        const items = Array.from({ length: count }, (_, index) => ({
            key: getItemKey ? getItemKey(index) : index,
            index,
            start: 0,
            size: typeof estimateSize === 'function' ? estimateSize(index) : estimateSize,
            lane: 0,
        }));
        const totalSize = items.reduce((sum, item) => sum + item.size, 0);
        return {
            getVirtualItems: () => items,
            getTotalSize: () => totalSize,
            scrollToIndex: vi.fn(),
            scrollToOffset: vi.fn(),
            scrollOffset: 0,
            measureElement: vi.fn(),
        };
    }
    return { useVirtualizer };
});

// Mock ResizeObserver (no longer needed for @tanstack/react-virtual, kept for other libs)
class MockResizeObserver {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock IntersectionObserver
const MockIntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: "",
    thresholds: [],
}));

global.IntersectionObserver = MockIntersectionObserver;
window.IntersectionObserver = MockIntersectionObserver;

// Mock import.meta.env
(globalThis as Record<string, unknown>).import = {
    meta: {
        env: {
            DEV: true,
            VITE_SUPABASE_URL: 'http://localhost:54321',
            VITE_SUPABASE_ANON_KEY: 'mock-anon-key',
        },
    },
};

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => {
    const mockChain: Record<string, ReturnType<typeof vi.fn>> & { then: ReturnType<typeof vi.fn>; single: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn>; throwOnError: ReturnType<typeof vi.fn> } = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        and: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        throwOnError: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    return {
        supabase: {
            from: vi.fn().mockReturnValue(mockChain),
            auth: {
                getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
                onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
                signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
                signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
                signOut: vi.fn().mockResolvedValue({ error: null }),
                resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
                updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
            },
            storage: {
                from: vi.fn().mockReturnValue({
                    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://mock.storage.url/avatar.png' } }),
                    upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
                }),
            },
            functions: {
                invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
            },
            rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
            channel: vi.fn().mockReturnValue({
                on: vi.fn().mockReturnThis(),
                subscribe: vi.fn(),
                unsubscribe: vi.fn(),
            }),
            removeChannel: vi.fn(),
        },
    };
});

// Mock framer-motion/m for tree-shaken imports (P1)
vi.mock('framer-motion/m', () => {
    const createEl = (tag: string) => {
        return ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => React.createElement(tag, props, children);
    };
    return { div: createEl('div') };
});

// Mock qrcode (canvas-dependent, not available in JSDOM)
vi.mock('qrcode', () => {
    const mockToCanvas = (_canvas: unknown, _text: string, _options: unknown, cb?: (err: Error | null) => void) => {
        if (cb) cb(null);
    };
    return { default: { toCanvas: mockToCanvas }, toCanvas: mockToCanvas };
});

// Mock framer-motion with simple pass-through components
vi.mock('framer-motion', () => {
    const createEl = (tag: string) => {
        return ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => React.createElement(tag, props, children);
    };
    return {
        motion: {
            div: createEl('div'),
            span: createEl('span'),
            p: createEl('p'),
            button: createEl('button'),
            ul: createEl('ul'),
            li: createEl('li'),
            form: createEl('form'),
            section: createEl('section'),
            article: createEl('article'),
            aside: createEl('aside'),
            header: createEl('header'),
            footer: createEl('footer'),
            main: createEl('main'),
            nav: createEl('nav'),
            h1: createEl('h1'),
            h2: createEl('h2'),
            h3: createEl('h3'),
        },
        AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
        useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
        useInView: () => true,
        useMotionValue: (v: number) => ({ get: () => v, set: vi.fn(), onChange: vi.fn() }),
        useSpring: (v: number) => ({ get: () => v, set: vi.fn() }),
        useTransform: () => ({ get: () => 0 }),
        animate: vi.fn(),
    };
});

// Mock AuthContext
vi.mock('@/contexts/AuthContextCore', () => ({
    useAuth: vi.fn(() => ({
        session: null,
        member: null,
        loading: false,
        signOut: vi.fn(),
        systemMode: 'produccion',
        memberships: [],
        setActiveMembership: vi.fn(),
        isSuperAdminSubdomain: false,
    })),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        Navigate: ({ to }: { to: string }) => React.createElement('div', { 'data-testid': 'navigate', 'data-to': to }),
        useNavigate: () => vi.fn(),
        useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
        useParams: () => ({}),
        useSearchParams: () => [new URLSearchParams(), vi.fn()],
    };
});
