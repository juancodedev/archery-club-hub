/* eslint-disable @typescript-eslint/no-explicit-any */
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

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock import.meta.env
(globalThis as any).import = {
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
    const mockChain: any = {
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

// Mock framer-motion with simple pass-through components
vi.mock('framer-motion', () => {
    const createEl = (tag: string) => {
        return ({ children, ...props }: any) => React.createElement(tag, props, children);
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
        AnimatePresence: ({ children }: any) => children,
        useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
        useInView: () => true,
        useMotionValue: (v: any) => ({ get: () => v, set: vi.fn(), onChange: vi.fn() }),
        useSpring: (v: any) => ({ get: () => v, set: vi.fn() }),
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
