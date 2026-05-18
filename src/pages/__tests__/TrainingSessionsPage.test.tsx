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
                if (table === 'trainings') {
                    return Promise.resolve(callback({
                        data: [
                            {
                                id: 'gps-session-1',
                                title: 'Entrenamiento GPS Sábado',
                                starts_at: new Date(Date.now() - 3600000).toISOString(),
                                ends_at: new Date(Date.now() + 3600000).toISOString(),
                                location_lat: -33.45678,
                                location_lng: -70.65432,
                                allowed_radius_meters: 100,
                                training_attendance: []
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
        expect(screen.getByText(/asistencia y localización/i)).toBeInTheDocument();
        expect(screen.getByText(/configuración de geocercas gps/i)).toBeInTheDocument();
    });

    it('should render the fixed QR section', () => {
        renderComponent();
        expect(screen.getByText(/código qr fijo \+ ubicación gps/i)).toBeInTheDocument();
        expect(screen.getByText(/módulo de asistencia/i)).toBeInTheDocument();
    });

    it('should list GPS training sessions', async () => {
        renderComponent();
        expect(await screen.findByText('Entrenamiento GPS Sábado')).toBeInTheDocument();
        expect(screen.getByText(/📍 radio: 100m/i)).toBeInTheDocument();
    });

    it('should show program button for admins', () => {
        renderComponent();
        expect(screen.getByText(/programar gps/i)).toBeInTheDocument();
    });
});
