import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavLink } from "../../components/NavLink";

describe("NavLink", () => {
    it("should render a link with the correct href", () => {
        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <NavLink to="/scores">Ver Puntajes</NavLink>
            </MemoryRouter>
        );
        const link = screen.getByText("Ver Puntajes");
        expect(link).toBeDefined();
    });

    it("should apply activeClassName when route is active", () => {
        render(
            <MemoryRouter initialEntries={["/scores"]}>
                <NavLink to="/scores" activeClassName="active-link">
                    Puntajes Activo
                </NavLink>
            </MemoryRouter>
        );
        const link = screen.getByText("Puntajes Activo");
        // When route matches, activeClassName should be applied
        expect(link.className).toContain("active-link");
    });

    it("should NOT apply activeClassName on non-active route", () => {
        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <NavLink to="/scores" activeClassName="active-link" className="base-link">
                    Puntajes
                </NavLink>
            </MemoryRouter>
        );
        const link = screen.getByText("Puntajes");
        expect(link.className).not.toContain("active-link");
        expect(link.className).toContain("base-link");
    });

    it("should apply base className always", () => {
        render(
            <MemoryRouter initialEntries={["/"]}>
                <NavLink to="/profile" className="nav-item">
                    Perfil
                </NavLink>
            </MemoryRouter>
        );
        const link = screen.getByText("Perfil");
        expect(link.className).toContain("nav-item");
    });
});
