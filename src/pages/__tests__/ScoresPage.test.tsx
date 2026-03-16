import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScoresPage from '../ScoresPage';

// Mock modules
vi.mock('@/contexts/AuthContextCore', () => ({
    useAuth: () => ({
        member: {
            id: 'test-member-id',
            full_name: 'Test Member',
            club_id: 'test-club-id',
            is_super_admin: false,
            roles: ['administrador'],
        },
    }),
}));

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn((table) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((callback) => {
                if (table === 'scores') {
                    return Promise.resolve(callback({
                        data: [
                            {
                                id: 'score-1',
                                member_id: 'test-member-id',
                                club_id: 'test-club-id',
                                total_score: 320,
                                event_name: 'Torneo Nacional',
                                score_date: '2024-03-15',
                                division: 'Recurvo Senior',
                                members: { full_name: 'Test Member' },
                                clubs: { name: 'Club Alpha' }
                            }
                        ], error: null
                    }));
                }
                if (table === 'clubs') {
                    return Promise.resolve(callback({ data: [{ id: 'test-club-id', name: 'Club Alpha' }], error: null }));
                }
                if (table === 'members') {
                    return Promise.resolve(callback({ data: [{ id: 'test-member-id', full_name: 'Test Member' }], error: null }));
                }
                return Promise.resolve(callback({ data: [], error: null }));
            }),
        })),
    },
}));

describe('ScoresPage', () => {
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
                    <ScoresPage />
                </BrowserRouter>
            </QueryClientProvider>
        );
    };

    it('should render the performance heading', () => {
        renderComponent();
        expect(screen.getByText(/rendimiento/i)).toBeInTheDocument();
    });

    it('should show scores list', async () => {
        renderComponent();
        const scoreEntry = await screen.findByText('Torneo Nacional');
        expect(scoreEntry).toBeInTheDocument();
        expect(screen.getByText('320')).toBeInTheDocument();
    });

    it('should expand score details on click', async () => {
        renderComponent();
        const scoreButton = await screen.findByText('Torneo Nacional');
        fireEvent.click(scoreButton.closest('button')!);

        expect(screen.getByText(/desglose de rondas/i)).toBeInTheDocument();
    });

    it('should show advanced filters toggle', () => {
        renderComponent();
        expect(screen.getByText(/filtros avanzados/i)).toBeInTheDocument();
    });
});
