import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClubSettingsPage from '../ClubSettingsPage';

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

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: (table: string) => {
            if (table === 'clubs') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: {
                                    id: 'test-club-id',
                                    name: 'Test Club',
                                    inscription_fee: 5000,
                                    monthly_fee: 10000,
                                    default_member_password: 'test-password',
                                },
                            }),
                        }),
                        order: () => Promise.resolve({
                            data: [{ id: 'test-club-id', name: 'Test Club' }],
                        }),
                    }),
                    update: () => ({
                        eq: () => Promise.resolve({ error: null }),
                    }),
                };
            }
            if (table === 'member_invitations') {
                return {
                    select: () => ({
                        eq: () => ({
                            order: () => ({
                                limit: () => Promise.resolve({
                                    data: [
                                        {
                                            id: 'inv-1',
                                            token: 'test-token',
                                            email: 'invite@example.com',
                                            expires_at: new Date(Date.now() + 86400000).toISOString(),
                                            used_at: null,
                                        },
                                    ],
                                }),
                            }),
                        }),
                    }),
                    insert: () => Promise.resolve({ error: null }),
                };
            }
            return {
                select: () => Promise.resolve({ data: [] }),
                insert: () => Promise.resolve({ error: null }),
            };
        },
    },
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

describe('ClubSettingsPage - Mobile Responsiveness', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
        vi.clearAllMocks();
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

    it('should render the page header with mobile-responsive text sizes', () => {
        renderComponent();

        const heading = screen.getByRole('heading', { name: /configuración del club/i });
        expect(heading).toBeInTheDocument();
        expect(heading.className).toContain('text-xl');
        expect(heading.className).toContain('sm:text-2xl');
    });

    it('should have mobile-first spacing in main container', () => {
        const { container } = renderComponent();

        const mainContainer = container.querySelector('.space-y-4');
        expect(mainContainer).toBeInTheDocument();
        expect(mainContainer?.className).toContain('sm:space-y-6');
    });

    it('should render fees form with responsive grid', () => {
        renderComponent();

        const inscriptionInput = screen.getByLabelText(/inscripción \(única vez\)/i);
        const monthlyInput = screen.getByLabelText(/mensualidad/i);

        expect(inscriptionInput).toBeInTheDocument();
        expect(monthlyInput).toBeInTheDocument();

        // Check for responsive grid classes
        const formSection = inscriptionInput.closest('.grid');
        expect(formSection?.className).toContain('grid-cols-1');
        expect(formSection?.className).toContain('sm:grid-cols-2');
    });

    it('should render save button with mobile-responsive width', () => {
        renderComponent();

        const saveButton = screen.getByRole('button', { name: /guardar configuración/i });
        expect(saveButton).toBeInTheDocument();
        expect(saveButton.className).toContain('w-full');
        expect(saveButton.className).toContain('sm:w-auto');
    });

    it('should render invitation creation form with responsive layout', async () => {
        renderComponent();

        const emailInput = screen.getByPlaceholderText(/email del invitado/i);
        const createButton = screen.getByRole('button', { name: /crear/i });

        expect(emailInput).toBeInTheDocument();
        expect(createButton).toBeInTheDocument();

        // Check for responsive button classes
        expect(createButton.className).toContain('w-full');
        expect(createButton.className).toContain('xs:w-auto');
    });

    it('should have responsive padding on glass cards', () => {
        const { container } = renderComponent();

        const glassCards = container.querySelectorAll('.glass');
        expect(glassCards.length).toBeGreaterThan(0);

        glassCards.forEach((card) => {
            expect(card.className).toMatch(/p-4|sm:p-5/);
        });
    });

    it('should render invitation list items when data is available', async () => {
        renderComponent();

        // Wait for invitations to load
        await screen.findByText(/invite@example.com/i);

        const invitationEmail = screen.getByText(/invite@example.com/i);
        expect(invitationEmail).toBeInTheDocument();
    });

    it('should allow fee inputs to be changed', () => {
        renderComponent();

        const inscriptionInput = screen.getByLabelText(/inscripción \(única vez\)/i) as HTMLInputElement;
        const monthlyInput = screen.getByLabelText(/mensualidad/i) as HTMLInputElement;

        fireEvent.change(inscriptionInput, { target: { value: '15000' } });
        fireEvent.change(monthlyInput, { target: { value: '20000' } });

        expect(inscriptionInput.value).toBe('15000');
        expect(monthlyInput.value).toBe('20000');
    });

    it('should have mobile-friendly icon sizes in header', () => {
        const { container } = renderComponent();

        const headerIcon = container.querySelector('h1 svg');
        expect(headerIcon?.className).toContain('h-5');
        expect(headerIcon?.className).toContain('w-5');
        expect(headerIcon?.className).toContain('sm:h-6');
        expect(headerIcon?.className).toContain('sm:w-6');
    });

    it('should render password input field', () => {
        renderComponent();

        const passwordInput = screen.getByPlaceholderText(/establece una contraseña segura/i);
        expect(passwordInput).toBeInTheDocument();
        expect(passwordInput).toHaveValue('test-password');
    });

    it('should have gap spacing that is responsive', () => {
        const { container } = renderComponent();

        const grids = container.querySelectorAll('.grid');
        grids.forEach((grid) => {
            expect(grid.className).toMatch(/gap-3|gap-4|sm:gap-4/);
        });
    });

    it('should render QR code and copy buttons for active invitations', async () => {
        renderComponent();

        // Wait for data to load
        await screen.findByText(/invite@example.com/i);

        const qrButtons = screen.getAllByTitle(/ver qr/i);
        const copyButtons = screen.getAllByTitle(/copiar enlace/i);

        expect(qrButtons.length).toBeGreaterThan(0);
        expect(copyButtons.length).toBeGreaterThan(0);
    });
});
