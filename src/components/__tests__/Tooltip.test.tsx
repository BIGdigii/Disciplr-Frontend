import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Tooltip } from "../Tooltip";
import zIndexTokens from "../../../design-system/tokens/z-index.json";

function renderTooltip(content = "Tooltip text", position: "top" | "bottom" = "top") {
  return render(
    <Tooltip content={content} position={position}>
      <button type="button">Trigger</button>
    </Tooltip>,
  );
}

describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders children without showing the tooltip initially", () => {
    renderTooltip();
    expect(screen.getByRole("button", { name: "Trigger" })).toBeInTheDocument();
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveStyle({ visibility: "hidden" });
  });

  it("renders the tooltip content string", () => {
    renderTooltip("Full hash value");
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Full hash value");
  });

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
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveStyle({ visibility: "hidden" });
  });

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
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveStyle({ visibility: "hidden" });
  });

  it("dismisses the tooltip when Escape is pressed", () => {
    renderTooltip();
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveStyle({ visibility: "visible" });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveStyle({ visibility: "hidden" });
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
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  it("tooltip is not aria-hidden when visible", () => {
    renderTooltip();
    fireEvent.mouseEnter(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).not.toHaveAttribute("aria-hidden", "true");
  });

  it("applies bottom positioning style when position='bottom'", () => {
    renderTooltip("tip", "bottom");
    fireEvent.mouseEnter(screen.getByRole("button"));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveStyle({ top: "calc(100% + 6px)" });
  });

  it("applies top positioning style when position='top'", () => {
    renderTooltip("tip", "top");
    fireEvent.mouseEnter(screen.getByRole("button"));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveStyle({ bottom: "calc(100% + 6px)" });
  });

  it("re-showing before hide timer fires keeps tooltip visible", () => {
    renderTooltip();
    const trigger = screen.getByRole("button");

    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    fireEvent.mouseEnter(trigger);

    act(() => vi.runAllTimers());
    expect(screen.getByRole("tooltip")).toHaveStyle({ visibility: "visible" });
  });

  it("applies the correct design system z-index token", () => {
    renderTooltip();
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    expect(tooltip).toHaveStyle({ zIndex: "var(--z-index-tooltip, 150)" });
  });

  it("maintains the z-index token when visible", () => {
    renderTooltip();
    const trigger = screen.getByRole("button");
    fireEvent.mouseEnter(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveStyle({ zIndex: "var(--z-index-tooltip, 150)" });
  });

  it("verifies the tooltip token preserves the documented stacking hierarchy", () => {
    const tooltipValue = zIndexTokens.zIndex.tooltip.$value;
    const headerValue = zIndexTokens.zIndex.header.$value;
    const baseValue = zIndexTokens.zIndex.base.$value;
    const drawerValue = zIndexTokens.zIndex.drawer.$value;
    const modalValue = zIndexTokens.zIndex.modal.$value;

    expect(tooltipValue).toBe(150);
    expect(tooltipValue).toBeGreaterThan(headerValue);
    expect(tooltipValue).toBeGreaterThan(baseValue);
    expect(tooltipValue).toBeLessThan(drawerValue);
    expect(tooltipValue).toBeLessThan(modalValue);
  });

  it("preserves z-index styling when custom className is provided", () => {
    render(
      <Tooltip content="Custom class test" className="custom-wrapper-class">
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    expect(tooltip).toHaveStyle({ zIndex: "var(--z-index-tooltip, 150)" });
  });
});
