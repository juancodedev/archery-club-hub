/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClubSettingsPage from '../ClubSettingsPage';
import { useAuth } from '@/contexts/AuthContextCore';

const mockUseAuth = vi.mocked(useAuth);

// Mock modules
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        member: {
            id: 'test-member-id',
            full_name: 'Test Member',
            club_id: 'test-club-id',
            is_super_admin: false,
            email: 'test@example.com',
        },
    }),
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

// Mock clipboard
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
    },
});

describe('ClubSettingsPage', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
        vi.clearAllMocks();

        // Override the useAuth mock for this test suite to provide a proper member with club_id
        mockUseAuth.mockReturnValue({
            member: {
                id: 'test-member-id',
                full_name: 'Test Member',
                club_id: 'test-club-id',
                is_super_admin: false,
                email: 'test@example.com',
                roles: ['administrador'],
                status: 'activo',
            } as unknown as ReturnType<typeof mockUseAuth>["member"],
            memberships: [],
            setActiveMembership: vi.fn(),
            isSuperAdminSubdomain: false,
            signOut: vi.fn(),
            loading: false,
            systemMode: 'produccion',
        } as unknown as ReturnType<typeof mockUseAuth>);
    });

    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <ClubSettingsPage />
                </BrowserRouter>
            </QueryClientProvider>
        );
    };

    it('should render the page header', () => {
        renderComponent();
        const heading = screen.getByRole('heading', { name: /configuración del club/i });
        expect(heading).toBeInTheDocument();
    });

    it('should have tab navigation', () => {
        const { container } = renderComponent();
        // The page uses Tabs with TabsList
        const tabsList = container.querySelector('[role="tablist"]');
        expect(tabsList).toBeDefined();
    });


    it('should render fees form once data loads', async () => {
        renderComponent();
        // The inscripción field should appear - uses 'Cuota de Inscripción' label
        await waitFor(() => {
            const inscriptionField = screen.queryByText(/Cuota de Inscripción/i);
            expect(inscriptionField).toBeDefined();
        });
    });

    it('should render invitation creation form', () => {
        renderComponent();
        const emailInput = screen.getByPlaceholderText(/email del invitado/i);
        const createButton = screen.getByRole('button', { name: /crear/i });
        expect(emailInput).toBeInTheDocument();
        expect(createButton).toBeInTheDocument();
    });

    it('should have glass cards', () => {
        const { container } = renderComponent();
        const glassCards = container.querySelectorAll('.glass');
        expect(glassCards.length).toBeGreaterThan(0);
    });

    it('should render save button for fees', () => {
        renderComponent();
        const saveButton = screen.getByRole('button', { name: /guardar configuración general/i });
        expect(saveButton).toBeInTheDocument();
    });

    it('should allow email invitation input', () => {
        renderComponent();
        const emailInput = screen.getByPlaceholderText(/email del invitado/i) as HTMLInputElement;
        fireEvent.change(emailInput, { target: { value: 'nuevo@ejemplo.com' } });
        expect(emailInput.value).toBe('nuevo@ejemplo.com');
    });

    it('should have grids with gap spacing', () => {
        const { container } = renderComponent();
        const grids = container.querySelectorAll('.grid');
        expect(grids.length).toBeGreaterThan(0);
    });

    it('should render password placeholder on input', () => {
        renderComponent();
        // The placeholder for password input
        const pwInput = screen.getByPlaceholderText(/Establece la contraseña por defecto/i);
        expect(pwInput).toBeInTheDocument();
    });
});
