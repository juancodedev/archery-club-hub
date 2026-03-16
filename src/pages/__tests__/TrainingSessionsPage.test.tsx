import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrainingSessionsPage from '../TrainingSessionsPage';

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
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockResolvedValue({ error: null }),
            delete: vi.fn().mockResolvedValue({ error: null }),
            then: vi.fn().mockImplementation((callback) => {
                if (table === 'training_sessions') {
                    return Promise.resolve(callback({
                        data: [
                            {
                                id: 'session-1',
                                name: 'Entrenamiento Sábado',
                                event_date: '2024-03-16',
                                discipline: 'outdoor',
                                distance_yards: 70,
                                target_type: '122 cm',
                                training_enrollments: []
                            }
                        ], error: null
                    }));
                }
                if (table === 'clubs') {
                    return Promise.resolve(callback({ data: [{ id: 'test-club-id', name: 'Club Alpha' }], error: null }));
                }
                return Promise.resolve(callback({ data: [], error: null }));
            }),
        })),
    },
}));

describe('TrainingSessionsPage', () => {
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
                    <TrainingSessionsPage />
                </BrowserRouter>
            </QueryClientProvider>
        );
    };

    it('should render the training heading', () => {
        renderComponent();
        expect(screen.getByText(/entrenamientos/i)).toBeInTheDocument();
        expect(screen.getByText(/gestiona tu asistencia/i)).toBeInTheDocument();
    });

    it('should list training sessions', async () => {
        renderComponent();
        expect(await screen.findByText('Entrenamiento Sábado')).toBeInTheDocument();
        expect(screen.getByText(/🎯 outdoor/i)).toBeInTheDocument();
        expect(screen.getByText(/70 yd/i)).toBeInTheDocument();
    });

    it('should show new session button for admins', () => {
        renderComponent();
        expect(screen.getByText(/nueva sesión/i)).toBeInTheDocument();
    });

    it('should show enroll button for members', async () => {
        renderComponent();
        expect(await screen.findByText(/inscribirme/i)).toBeInTheDocument();
    });
});
