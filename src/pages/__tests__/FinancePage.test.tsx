import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FinancePage from '../FinancePage';

// Mock modules
vi.mock('@/contexts/AuthContextCore', () => ({
    useAuth: () => ({
        member: {
            id: 'test-member-id',
            full_name: 'Test Member',
            club_id: 'test-club-id',
            is_super_admin: false,
        },
    }),
}));

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn((table) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((callback) => {
                if (table === 'financial_entries') {
                    return Promise.resolve(callback({
                        data: [
                            { id: '1', type: 'income', amount: 1000, category: 'Membresía', entry_date: '2024-03-01', description: 'Pago Juan' },
                            { id: '2', type: 'expense', amount: 400, category: 'Servicios', entry_date: '2024-03-02', description: 'Luz' }
                        ], error: null
                    }));
                }
                if (table === 'clubs') {
                    return Promise.resolve(callback({ data: [], error: null }));
                }
                return Promise.resolve(callback({ data: [], error: null }));
            }),
        })),
        storage: {
            from: vi.fn().mockReturnThis(),
        }
    },
}));

describe('FinancePage', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <FinancePage />
                </BrowserRouter>
            </QueryClientProvider>
        );
    };

    it('should render the finance heading', () => {
        renderComponent();
        expect(screen.getByText(/finanzas/i)).toBeInTheDocument();
        expect(screen.getByText(/reporte de ingresos, gastos y balance/i)).toBeInTheDocument();
    });

    it('should render summary cards', () => {
        renderComponent();
        // The summary card titles are h3
        expect(screen.getByRole('heading', { name: /ingresos/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /gastos/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /balance/i })).toBeInTheDocument();
    });

    it('should list transactions', async () => {
        renderComponent();
        expect(await screen.findByText('Pago Juan')).toBeInTheDocument();
        expect(await screen.findByText('Luz')).toBeInTheDocument();
    });

    it('should show action buttons', () => {
        renderComponent();
        expect(screen.getAllByText(/ingreso/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/gasto/i).length).toBeGreaterThan(0);
    });
});
