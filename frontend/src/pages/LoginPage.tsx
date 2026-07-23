import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent-soft), transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brass-soft), transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white font-display font-semibold text-lg mb-4 shadow-card">
            VH
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Virata HR</h1>
          <p className="text-sm text-ink-500 mt-1.5">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-1 border border-line rounded-2xl p-7 shadow-floating space-y-4"
        >
          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-status-critical bg-status-critical-soft border border-status-critical/20 rounded-lg px-3 py-2"
            >
              {error}
            </motion.div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-0 px-3 py-2.5 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-0 px-3 py-2.5 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-accent text-white text-sm font-semibold py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
