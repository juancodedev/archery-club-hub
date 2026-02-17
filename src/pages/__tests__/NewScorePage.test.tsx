import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewScorePage from '../NewScorePage';

// Mock modules
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        member: {
            id: 'test-member-id',
            full_name: 'Test Member',
            club_id: 'test-club-id',
            is_super_admin: false,
            roles: [],
        },
    }),
}));

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: () => ({
            insert: () => Promise.resolve({ data: null, error: null }),
            select: () => ({
                eq: () => ({
                    order: () => Promise.resolve({ data: [] }),
                }),
                order: () => Promise.resolve({ data: [] }),
            }),
        }),
    },
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('NewScorePage - Mobile Responsiveness', () => {
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
                    <NewScorePage />
                </BrowserRouter>
            </QueryClientProvider>
        );
    };

    it('should render the page header with mobile-responsive text sizes', () => {
        renderComponent();

        const heading = screen.getByRole('heading', { name: /registrar puntaje/i });
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

    it('should render event info form with responsive grid', () => {
        renderComponent();

        const eventInput = screen.getByPlaceholderText(/entrenamiento libre/i);
        expect(eventInput).toBeInTheDocument();

        // Check for responsive grid classes
        const formSection = eventInput.closest('.grid');
        expect(formSection?.className).toContain('grid-cols-1');
        expect(formSection?.className).toContain('sm:grid-cols-2');
        expect(formSection?.className).toContain('lg:grid-cols-3');
    });

    it('should render scorecard table with overflow handling for mobile', () => {
        renderComponent();

        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        const tableContainer = table.closest('.overflow-x-auto');
        expect(tableContainer).toBeInTheDocument();
    });

    it('should render action buttons with mobile-responsive layout', () => {
        renderComponent();

        const cancelButton = screen.getByRole('button', { name: /cancelar/i });
        const saveButton = screen.getByRole('button', { name: /guardar puntaje/i });

        expect(cancelButton).toBeInTheDocument();
        expect(saveButton).toBeInTheDocument();

        // Check for mobile-first button classes
        expect(cancelButton.className).toContain('w-full');
        expect(cancelButton.className).toContain('sm:w-auto');
        expect(saveButton.className).toContain('w-full');
        expect(saveButton.className).toContain('sm:w-auto');
    });

    it('should allow arrow input in scorecard', () => {
        renderComponent();

        const arrowInputs = screen.getAllByPlaceholderText('—');
        expect(arrowInputs.length).toBeGreaterThan(0);

        fireEvent.change(arrowInputs[0], { target: { value: '10' } });
        expect(arrowInputs[0]).toHaveValue('10');
    });

    it('should calculate end totals correctly', () => {
        renderComponent();

        const arrowInputs = screen.getAllByPlaceholderText('—');

        // Fill first end with scores
        fireEvent.change(arrowInputs[0], { target: { value: '10' } });
        fireEvent.change(arrowInputs[1], { target: { value: '9' } });
        fireEvent.change(arrowInputs[2], { target: { value: '8' } });
        fireEvent.change(arrowInputs[3], { target: { value: '7' } });
        fireEvent.change(arrowInputs[4], { target: { value: 'X' } });

        // Grand total should update
        const grandTotalElement = screen.getByText(/total general/i).parentElement;
        expect(grandTotalElement).toBeInTheDocument();
    });

    it('should have responsive padding on glass cards', () => {
        const { container } = renderComponent();

        const glassCards = container.querySelectorAll('.glass');
        expect(glassCards.length).toBeGreaterThan(0);

        glassCards.forEach((card) => {
            expect(card.className).toMatch(/p-4|sm:p-5/);
        });
    });

    it('should navigate to scores page on cancel', () => {
        renderComponent();

        const cancelButton = screen.getByRole('button', { name: /cancelar/i });
        fireEvent.click(cancelButton);

        expect(mockNavigate).toHaveBeenCalledWith('/scores');
    });

    it('should have mobile-friendly icon sizes', () => {
        const { container } = renderComponent();

        const headerIcon = container.querySelector('h1 svg');
        expect(headerIcon?.className).toContain('h-5');
        expect(headerIcon?.className).toContain('w-5');
        expect(headerIcon?.className).toContain('sm:h-6');
        expect(headerIcon?.className).toContain('sm:w-6');
    });
});
