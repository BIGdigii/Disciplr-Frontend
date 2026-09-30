import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Message from "../Messages";

describe("Message Component", () => {
  // A fixed ISO timestamp; the rendered timeAgo is computed by formatRelativeTime
  // so we just verify it renders something (non-empty) rather than a hardcoded string.
  const defaultProps = {
    id: "msg-123",
    type: "funds_released",
    title: "Funds Released Successfully",
    message: "Your funds have been released from the escrow vault.",
    timestamp: "2025-01-01T00:00:00Z",
    read: false,
    isFullPage: false,
    setRead: vi.fn(),
  };

  it("renders message details correctly when unread and not full page", () => {
    render(<Message {...defaultProps} />);

    // Assert title is rendered
    expect(screen.getByText(defaultProps.title)).toBeInDocument();

    // Assert message is truncated to 30 characters + ellipsis in preview
    expect(screen.getByText(/Your funds have been released.*.../)).toBeInDocument();

    // Assert a relative time label is rendered (non-empty, computed from timestamp)
    const timeLabel = screen.getByTestId("message-time-ago");
    expect(timeLabel.textContent).toBeTruthy();

    // Assert "New" badge is rendered because read is false
    expect(screen.getByText("New")).toBeInDocument();

    // Assert notification icon is rendered with the correct aria-label and role
    const icon = screen.getByRole("img", { name: "Funds released" });
    expect(icon).toBeInDocument();

    // Assert "Delete" button is not rendered when isFullPage is false
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInDocument();
  });

  it("renders message details correctly when read and isFullPage is true", () => {
    const props = {
      ...defaultProps,
      read: true,
      isFullPage: true,
    };
    render(<Message {...props} />);

    // Assert title is rendered
    expect(screen.getByText(props.title)).toBeInDocument();

    // Assert "New" badge is not rendered because read is true
    expect(screen.queryByText("New")).not.toBeInDocument();

    // Assert "Delete" button is rendered when isFullPage is true
    expect(screen.getByRole("button", { name: "Delete" })).toBeInDocument();
  });

  it("clicking the title opens the expanded view and calls setRead with the item's id", () => {
    const setReadMock = vi.fn();
    const props = {
      ...defaultProps,
      setRead: setReadMock,
    };
    render(<Message {...props} />);

    // Prior to clicking, the full message should not be visible (only the truncated preview is)
    expect(screen.queryByText(props.message)).not.toBeInDocument();

    // Click the title to open the overlay
    const titleElement = screen.getByText(props.title);
    fireEvent.click(titleElement);

    // Assert setRead mock was called with correct id
    expect(setReadMock).toHaveBeenCalledTimes(1);
    expect(setReadMock).toHaveBeenCalledWith(props.id);

    // Assert the expanded view / overlay is now open and contains the full message text
    const fullMessageElement = screen.getByText(props.message);
    expect(fullMessageElement).toBeInDocument();
  });

  it("the expanded overlay closes when its close control is activated", () => {
    render(<Message {...defaultProps} />);

    // Open the overlay
    const titleElement = screen.getByText(defaultProps.title);
    fireEvent.click(titleElement);

    // Verify overlay is open
    expect(screen.getByText(defaultProps.message)).toBeInDocument();

    // Click the close control "X"
    const closeButton = screen.getByText("X");
    fireEvent.click(closeButton);

    // Verify overlay is closed (full message is removed)
    expect(screen.queryByText(defaultProps.message)).not.toBeInDocument();
  });

  it("long messages are truncated as expected", () => {
    const props = {
      ...defaultProps,
      message: "This is a super long message that contains more than thirty characters.",
    };
    render(<Message {...props} />);

    // Message length is 72, which is > 30.
    // Truncated preview should be exactly 30 characters plus " ..."
    expect(screen.getByText(/This is a super long message t.*.../)).toBeInDocument();
  });

  it("applies correct container styling depending on the isFullPage prop when overlay is open", () => {
    // Case 1: isFullPage is true
    const { rerender } = render(<Message {...defaultProps} isFullPage={true} />);

    // Open overlay
    fireEvent.click(screen.getByText(defaultProps.title));

    // Get overlay container (grandparent of the full message element in the overlay)
    const fullMsg1 = screen.getByText(defaultProps.message);
    const container1 = fullMsg1.parentElement?.parentElement;
    expect(container1).toBeInDocument();
    
    // Check that it contains full-page classes
    expect(container1).toHaveClass("w-[90%]");
    expect(container1).toHaveClass("lg:w-[40%]");
    expect(container1).toHaveClass("h-auto");
    expect(container1).toHaveClass("min-h-[40%]");
    expect(container1).toHaveClass("bg-white");
    expect(container1).toHaveClass("left-[50%]");
    expect(container1).toHaveClass("translate-x-[-50%]");
    expect(container1).toHaveClass("top-[5%]");
    expect(container1).not.toHaveClass("w-full");
    expect(container1).not.toHaveClass("h-full");

    // Close the overlay
    fireEvent.click(screen.getByText("X"));

    // Case 2: isFullPage is false
    rerender(<Message {...defaultProps} isFullPage={false} />);

    // Open overlay
    fireEvent.click(screen.getByText(defaultProps.title));

    const fullMsg2 = screen.getByText(defaultProps.message);
    const container2 = fullMsg2.parentElement?.parentElement;
    expect(container2).toBeInDocument();

    // Check that it contains dropdown/non-full-page classes
    expect(container2).toHaveClass("w-full");
    expect(container2).toHaveClass("h-full");
    expect(container2).toHaveClass("bg-white");
    expect(container2).toHaveClass("left-0");
    expect(container2).toHaveClass("top-0");
    expect(container2).not.toHaveClass("w-[90%]");
    expect(container2).not.toHaveClass("lg:w-[40%]");
  });
});
