import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Tooltip } from "../Tooltip";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTooltip(
  content = "Tooltip text",
  position: "top" | "bottom" = "top",
) {
  return render(
    <Tooltip content={content} position={position}>
      <button type="button">Trigger</button>
    </Tooltip>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it("renders children without showing the tooltip initially", () => {
    renderTooltip();
    expect(screen.getByRole("button", { name: "Trigger" })).toBeInTheDocument();
    // tooltip role exists in DOM (for aria linkage) but is not visible
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveStyle({ visibility: "hidden" });
  });

  it("renders the tooltip content string", () => {
    renderTooltip("Full hash value");
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(
      "Full hash value",
    );
  });

  // ── Hover ─────────────────────────────────────────────────────────────────

  it("shows the tooltip on mouseenter", () => {
    renderTooltip();
    fireEvent.mouseEnter(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveStyle({ visibility: "visible" });
  });

  it("hides the tooltip after mouseleave (after hide delay)", () => {
    renderTooltip();
    const trigger = screen.getByRole("button");
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole("tooltip")).toHaveStyle({ visibility: "visible" });

    fireEvent.mouseLeave(trigger);
    act(() => vi.runAllTimers());
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveStyle({
      visibility: "hidden",
    });
  });

  // ── Focus ─────────────────────────────────────────────────────────────────

  it("shows the tooltip on focus", () => {
    renderTooltip();
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveStyle({ visibility: "visible" });
  });

  it("hides the tooltip on blur (after hide delay)", () => {
    renderTooltip();
    const trigger = screen.getByRole("button");
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toHaveStyle({ visibility: "visible" });

    fireEvent.blur(trigger);
    act(() => vi.runAllTimers());
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveStyle({
      visibility: "hidden",
    });
  });

  // ── Escape key ────────────────────────────────────────────────────────────

  it("dismisses the tooltip when Escape is pressed", () => {
    renderTooltip();
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveStyle({ visibility: "visible" });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveStyle({
      visibility: "hidden",
    });
  });

  it("does not throw when Escape is pressed while tooltip is already hidden", () => {
    renderTooltip();
    expect(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    }).not.toThrow();
  });

  it("other keys do not dismiss the tooltip", () => {
    renderTooltip();
    fireEvent.focus(screen.getByRole("button"));
    fireEvent.keyDown(document, { key: "Enter" });
    expect(screen.getByRole("tooltip")).toHaveStyle({ visibility: "visible" });
  });

  // ── aria-describedby wiring ────────────────────────────────────────────────

  it("sets aria-describedby on the trigger pointing to the tooltip id when visible", () => {
    renderTooltip();
    const trigger = screen.getByRole("button");
    fireEvent.mouseEnter(trigger);

    const tooltipId = screen.getByRole("tooltip").getAttribute("id");
    expect(tooltipId).toBeTruthy();
    expect(trigger).toHaveAttribute("aria-describedby", tooltipId);
  });

  it("removes aria-describedby from trigger when tooltip is hidden", () => {
    renderTooltip();
    const trigger = screen.getByRole("button");

    fireEvent.mouseEnter(trigger);
    expect(trigger).toHaveAttribute("aria-describedby");

    fireEvent.mouseLeave(trigger);
    act(() => vi.runAllTimers());
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("tooltip element has role='tooltip'", () => {
    renderTooltip();
    expect(screen.getByRole("tooltip", { hidden: true })).toBeInTheDocument();
  });

  it("tooltip is aria-hidden when not visible", () => {
    renderTooltip();
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("tooltip is not aria-hidden when visible", () => {
    renderTooltip();
    fireEvent.mouseEnter(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).not.toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  // ── Position prop ─────────────────────────────────────────────────────────

  it("applies bottom positioning style when position='bottom'", () => {
    renderTooltip("tip", "bottom");
    fireEvent.mouseEnter(screen.getByRole("button"));
    const tooltip = screen.getByRole("tooltip");
    // bottom-positioned tooltip has a `top` offset, not a `bottom` offset
    expect(tooltip).toHaveStyle({ top: "calc(100% + 6px)" });
  });

  it("applies top positioning style when position='top'", () => {
    renderTooltip("tip", "top");
    fireEvent.mouseEnter(screen.getByRole("button"));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveStyle({ bottom: "calc(100% + 6px)" });
  });

  // ── Re-show cancels pending hide timer ───────────────────────────────────

  it("re-showing before hide timer fires keeps tooltip visible", () => {
    renderTooltip();
    const trigger = screen.getByRole("button");

    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger); // starts hide timer
    fireEvent.mouseEnter(trigger); // cancels timer, re-shows

    act(() => vi.runAllTimers());
    expect(screen.getByRole("tooltip")).toHaveStyle({ visibility: "visible" });
  });

  // ── Styling & Stacking ───────────────────────────────────────────────────

  it("applies the correct design system z-index token", () => {
    renderTooltip();
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    expect(tooltip).toHaveStyle({ zIndex: "var(--z-index-tooltip)" });
  });
});
