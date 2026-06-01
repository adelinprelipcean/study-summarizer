import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Login from "../pages/Login";
import api from "../api";

vi.mock("../api", () => ({
  default: { post: vi.fn() },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock("lucide-react", () => ({
  ShieldCheck: () => <span data-testid="shield-icon" />,
  ArrowRight: () => <span data-testid="arrow-icon" />,
}));

vi.mock("../components/ThemeToggle", () => ({
  default: () => <button data-testid="theme-toggle">Theme</button>,
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe("Login page", () => {
  beforeEach(() => {
    // resetAllMocks clears queued once-values too — prevents bleed between tests
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("renders the Welcome Back heading", () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });

  it("renders email and password inputs", () => {
    renderLogin();
    expect(document.querySelector('input[type="email"]')).toBeTruthy();
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('renders the "Continue Journey" submit button', () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /continue journey/i })).toBeInTheDocument();
  });

  it("shows error message on failed login", async () => {
    api.post.mockRejectedValueOnce({
      response: { status: 401, data: { detail: "Invalid credentials" } },
    });

    renderLogin();

    fireEvent.change(document.querySelector('input[type="email"]'), {
      target: { value: "bad@example.com" },
    });
    fireEvent.change(document.querySelector('input[type="password"]'), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue journey/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials, warrior/i)).toBeInTheDocument();
    });
  });

  it("stores token in localStorage on successful login", async () => {
    api.post.mockResolvedValueOnce({ data: { access_token: "jwt-token-abc" } });

    renderLogin();

    fireEvent.change(document.querySelector('input[type="email"]'), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(document.querySelector('input[type="password"]'), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue journey/i }));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("jwt-token-abc");
    });
  });
});
