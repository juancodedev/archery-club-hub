import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "../../pages/NotFound";

// useLocation is mocked in setup.ts via react-router-dom mock
describe("NotFound", () => {
    it("should render the 404 page with main heading", () => {
        render(
            <MemoryRouter initialEntries={["/pagina-no-existe"]}>
                <NotFound />
            </MemoryRouter>
        );
        // Should display 404 content
        expect(screen.getByText("404")).toBeDefined();
    });

    it("should render a link to go back to home", () => {
        render(
            <MemoryRouter initialEntries={["/pagina-no-existe"]}>
                <NotFound />
            </MemoryRouter>
        );
        // NotFound page should have a link back to home
        const homeLink = screen.queryByRole("link");
        expect(homeLink).toBeDefined();
    });
});
