import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RingCell from "../RingCell";

describe("RingCell", () => {
  it("paints a field 5 like the black spot of the field face", () => {
    render(<RingCell ifaaRound="field" value="5" />);
    expect(screen.getByText("5")).toHaveClass("bg-ifaa-black", "text-ifaa-white");
  });

  it("paints an indoor 3 navy", () => {
    render(<RingCell ifaaRound="indoor_standard" value="3" />);
    expect(screen.getByText("3")).toHaveClass("bg-ifaa-navy");
  });

  it("shows a miss as M on the muted surface", () => {
    render(<RingCell ifaaRound="hunter" value="M" />);
    expect(screen.getByText("M")).toHaveClass("bg-muted");
  });

  it("shows an empty arrow as a dash", () => {
    render(<RingCell ifaaRound="field" value="" />);
    expect(screen.getByText("—")).toHaveClass("border-dashed");
  });

  it("keeps values outside ring rounds neutral", () => {
    render(<RingCell ifaaRound={null} value="9" />);
    expect(screen.getByText("9")).toHaveClass("bg-card");
  });
});
