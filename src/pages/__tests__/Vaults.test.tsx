import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { vi } from "vitest";
import Vaults, { VaultsInner } from "../../pages/Vaults";
import type { Vault } from "../../types/vault";

// Helper to mock fetch function
const mockSuccess = <T, |>(data: T) => vi.fn().mockResolvedValue(data);
const mockFailure = (message = "Network error") =>
  vi.fn().mockRejectedValue(new Error(message));

function CreateVaultStateProbe() {
  const location = useLocation();
  return (
    <pre data-testid="create-vault-state">
      {JSON.stringify(location.state ?? {})}
    </pre>
  );
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock matchMedia for Tooltip
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Vaults page states", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test("shows loading skeletons initially", async () => {
    render(<Vaults fetchVaults={mockSuccess([])} />);
    // Skeletons should be present immediately
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
    // Wait for loading to finish (no data)
    await waitFor(() =>
      expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument(),
    );
  });

  test("shows empty state when no vaults", async () => {
    render(<Vaults fetchVaults={mockSuccess([])} />);
    await waitFor(() => screen.getByText(/You don’t have any vaults yet./i));
    expect(
      screen.getByRole("link", { name: /Create your first vault/i }),
    ).toBeInTheDocument();
  });

  test("shows data state when vaults exist", async () => {
    const mockData = [
      {
        id: "1",
        name: "Test Vault",
        amount: 1000,
        currency: "USDC",
        status: "active" as const,
        deadline: "2025-01-01T00:00:00Z",
      },
    ];
    render(<Vaults fetchVaults={mockSuccess(mockData)} />);
    await waitFor(() => screen.getByText("Test Vault"));
    expect(screen.getByText(/Test Vault/i)).toBeInTheDocument();
  });

  test("duplicate action navigates to CreateVault with prefilled state", async () => {
    const mockData = [
      {
        id: "1",
        name: "Test Vault",
        amount: 1000,
        currency: "USDC",
        status: "active" as const,
        deadline: "2025-01-01T00:00:00Z",
        successAddress: "GSUCC3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQKK",
        failureAddress: "GFAIL3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQKK",
        milestones: [{ title: "Milestone A", criteria: "Criteria A" }],
        createdAt: "2024-01-01T00:00:00Z",
        creatorAddress: "GCREA3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQK",
        contractAddress: "GCONT3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQK",
        transactions: [],
      },
    ];

    render(
      <MemoryRouter initialEntries={["/vaults"]}>
        <Routes>
          <Route
            path="/vaults"
            element={<VaultsInner fetchVaults={mockSuccess(mockData)} />}
          />
          <Route path="/vaults/create" element={<CreateVaultStateProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Test Vault"));
    await userEvent.click(screen.getByRole("link", { name: /duplicate/i }));

    const state = JSON.parse(
      screen.getByTestId("create-vault-state").textContent ?? "{}",
    );
    expect(state.createVaultPrefill).toMatchObject({
      sourceVaultId: "1",
      sourceVaultName: "Test Vault",
      amount: "1000",
      successAddress: "GSUCC3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQKK",
      failureAddress: "GFAIL3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQK",
      milestones: [{ title: "Milestone A", criteria: "Criteria A" }],
    });
    expect(state.createVaultPrefill).not.toHaveProperty("deadline");
  });

  test("shows error state and can retry", async () => {
    const fetchMock = mockFailure();
    render(<Vaults fetchVaults={fetchMock} />);
    await waitFor(() => screen.getByText(/Failed to load vaults./i));
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();
    // Mock success on retry
    fetchMock.mockImplementationOnce(() => Promise.resolve([]));
    await userEvent.click(retryBtn);
    await waitFor(() => screen.getByText(/You don’t have any vaults yet./i));
  });
});

describe("Vaults view toggle", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test("defaults to list view when no preference exists", async () => {
    const mockData = [
      {
        id: "1",
        name: "Test Vault",
        amount: 1000,
        currency: "USDC",
        status: "active" as any,
        deadline: "2025-01-01T00:00:00Z",
        milestones: [],
      },
    ];
    render(<Vaults fetchVaults={mockSuccess(mockData)} />);
    await waitFor(() => screen.getByText("Test Vault"));

    const listButton = screen.getByRole("radio", { name: "List" });
    const gridButton = screen.getByRole("radio", { name: "Grid" });

    expect(listButton).toHaveAttribute("aria-checked", "true");
    expect(gridButton).toHaveAttribute("aria-checked", "false");
  });

  test("switches to grid view when grid button is clicked", async () => {
    const mockData = [
      {
        id: "1",
        name: "Test Vault",
        amount: 1000,
        currency: "USDC",
        status: "active" as any,
        deadline: "2025-01-01T00:00:00Z",
        milestones: [],
      },
    ];
    render(<Vaults fetchVaults={mockSuccess(mockData)} />);
    await waitFor(() => screen.getByText("Test Vault"));

    const gridButton = screen.getByRole("radio", { name: "Grid" });
    await userEvent.click(gridButton);

    await waitFor(() =>
      expect(gridButton).toHaveAttribute("aria-checked", "true"),
    );
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute(
        "aria-checked",
        "false",
      ),
    );
  });

  test("switches back to list view when list button is clicked", async () => {
    const mockData = [
      {
        id: "1",
        name: "Test Vault",
        amount: 1000,
        currency: "USDC",
        status: "active" as any,
        deadline: "2025-01-01T00:00:00Z",
        milestones: [],
      },
    ];
    render(<Vaults fetchVaults={mockSuccess(mockData)} />);
    await waitFor(() => screen.getByText("Test Vault"));

    const gridButton = screen.getByRole("radio", { name: "Grid" });
    await userEvent.click(gridButton);

    const listButton = screen.getByRole("radio", { name: "List" });
    await userEvent.click(listButton);

    await waitFor(() =>
      expect(listButton).toHaveAttribute("aria-checked", "true"),
    );
    await waitFor(() =>
      expect(gridButton).toHaveAttribute("aria-checked", "false"),
    );
  });

  test("persists grid view preference to localStorage", async () => {
    const mockData = [
      {
        id: "1",
        name: "Test Vault",
        amount: 1000,
        currency: "USDC",
        status: "active" as any,
        deadline: "2025-01-01T00:00:00Z",
        milestones: [],
      },
    ];
    render(<Vaults fetchVaults={mockSuccess(mockData)} />);
    await waitFor(() => screen.getByText("Test Vault"));

    const gridButton = screen.getByRole("radio", { name: "Grid" });
    await userEvent.click(gridButton);

    await waitFor(() =>
      expect(gridButton).toHaveAttribute("aria-checked", "true"),
    );
    expect(localStorageMock.getItem("vaults-view-preference")).toBe("grid");
  });

  test("persists list view preference to localStorage", async () => {
    const mockData = [
      {
        id: "1",
        name: "Test Vault",
        amount: 1000,
        currency: "USDC",
        status: "active" as any,
        deadline: "2025-01-01T00:00:00Z",
        milestones: [],
      },
    ];
    render(<Vaults fetchVaults={mockSuccess(mockData)} />);
    await waitFor(() => screen.getByText("Test Vault"));

    const gridButton = screen.getByRole("radio", { name: "Grid" });
    await userEvent.click(gridButton);

    const listButton = screen.getByRole("radio", { name: "List" });
    await userEvent.click(listButton);

    await waitFor(() =>
      expect(listButton).toHaveAttribute("aria-checked", "true"),
    );
    expect(localStorageMock.getItem("vaults-view-preference")).toBe("list");
  });

  test("loads grid view from localStorage preference", async () => {
    localStorageMock.setItem("vaults-view-preference", "grid");

    const mockData = [
      {
        id: "1",
        name: "Test Vault",
        amount: 1000,
        currency: "USDC",
        status: "active" as any,
        deadline: "2025-01-01T00:00:00Z",
        milestones: [],
      },
    ];
    render(<Vaults fetchVaults={mockSuccess(mockData)} />);
    await waitFor(() => screen.getByText("Test Vault"));

    const gridButton = screen.getByRole("radio", { name: "Grid" });
    const listButton = screen.getByRole("radio", { name: "List" });

    expect(gridButton).toHaveAttribute("aria-checked", "true");
    expect(listButton).toHaveAttribute("aria-checked", "false");
  });

  test("shows empty state in both views", async () => {
    render(<Vaults fetchVaults={mockSuccess([])} />);
    await waitFor(() => screen.getByText(/You don’t have any vaults yet./i));

    // Toggle buttons should still be present
    expect(screen.getByRole("radio", { name: "List" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Grid" })).toBeInTheDocument();
  });

  test("renders vaults VaultCard in grid view", async () => {
    const mockData = [
      {
        id: "1",
        name: "Test Vault",
        amount: 1000,
        currency: "USDC",
        status: "active" as any,
        deadline: "2025-01-01T00:00:00Z",
        milestones: [],
      },
    ];
    render(<Vaults fetchVaults={mockSuccess(mockData)} />);
    await waitFor(() => screen.getByText("Test Vault"));

    const gridButton = screen.getByRole("radio", { name: "Grid" });
    await userEvent.click(gridButton);

    // VaultCard should be rendered with progress bar
    await waitFor(() => screen.getByLabelText(/Test Vault progress/i));
  });

  test("handles localStorage errors gracefully", async () => {
    // Mock localStorage to throw error
    const originalGetItem = localStorageMock.getItem;
    localStorageMock.getItem = vi.fn(() => {
      throw new Error("localStorage error");
    });

    const mockData = [
      {
        id: "1",
        name: "Test Vault",
        amount: 1000,
        currency: "USDC",
        status: "active" as any,
        deadline: "2025-01-01T00:00:00Z",
        milestones: [],
      },
    ];
    render(<Vaults fetchVaults={mockSuccess(mockData)} />);

    // Should still render with default list view
    await waitFor(() => screen.getByText("Test Vault"));
    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    localStorageMock.getItem = originalGetItem;
  });
});

describe("Vaults filter and sort", () => {
  const vaults: Vault[] = [
    {
      id: "1",
      name: "Alpha Project",
      amount: 500,
      currency: "USDC",
      status: "active",
      deadline: "2025-06-01T00:00:00Z",
      milestones: [],
    },
    {
      id: "2",
      name: "Beta Project",
      amount: 1500,
      currency: "USDC",
      status: "completed",
      deadline: "2025-03-01T00:00:00Z",
      milestones: [],
    },
    {
      id: "3",
      name: "Gamma Project",
      amount: 250,
      currency: "USDC",
      status: "failed",
      deadline: "2025-01-01T00:00:00Z",
      milestones: [],
    },
  ];

  test("filters vaults by status", async () => {
    render(<Vaults fetchVaults={mockSuccess(vaults)} />);
    await waitFor(() => screen.getByText("Alpha Project"));

    await userEvent.selectOptions(
      screen.getByLabelText(/Filter by status/i),
      "active",
    );

    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.queryByText("Beta Project")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma Project")).not.toBeInTheDocument();
  });

  test("filters vaults by search query", async () => {
    render(<Vaults fetchVaults={mockSuccess(vaults)} />);
    await waitFor(() => screen.getByText("Alpha Project"));

    await userEvent.type(
      screen.getByLabelText(/Search vaults/i),
      "beta",
    );

    expect(screen.getByText("Beta Project")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Project")).not.toBeInTheDocument();
  });

  test("sorts vaults by amount ascending", async () => {
    render(<Vaults fetchVaults={mockSuccess(vaults)} />);
    await waitFor(() => screen.getByText("Alpha Project"));

    await userEvent.selectOptions(screen.getByLabelText(/Sort by/i), "amount");
    await userEvent.selectOptions(
      screen.getByLabelText(/Sort direction/i),
      "asc",
    );

    const names = screen
      .getAllByTextContentMatching(/Project/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Gamma Project", "Alpha Project", "Beta Project"]);
  });

  test("sorts vaults by deadline descending", async () => {
    render(<Vaults fetchVaults={mockSuccess(vaults)} />);
    await waitFor(() => screen.getByText("Alpha Project"));

    await userEvent.selectOptions(
      screen.getByLabelText(/Sort by/i),
      "deadline",
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/Sort direction/i),
      "desc",
    );

    const names = screen
      .getAllByTextContentMatching(/Project/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Alpha Project", "Beta Project", "Gamma Project"]);
  });

  test("shows no-match state when filters exclude all vaults", async () => {
    render(<Vaults fetchVaults={mockSuccess(vaults)} />);
    await waitFor(() => screen.getByText("Alpha Project"));

    await userEvent.type(
      screen.getByLabelText(/Search vaults/i),
      "nonexistent",
    );

    expect(screen.getByText(/No vaults match your filters./i)).toBeInTheDocument();
  });
});
