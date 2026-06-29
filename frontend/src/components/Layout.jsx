import { TrendingUp, LogOut, BarChart3 } from "lucide-react";
import { auth } from "../services/firebase";
import { signOut } from "firebase/auth";

export default function Layout({ children }) {
  const user = auth.currentUser;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={22} />
            <h1 className="text-lg font-bold">Borsa</h1>
            <span className="text-gray-500 text-xs hidden sm:inline">EGX Stock Advisor</span>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm hidden sm:inline">{user.email}</span>
              <button
                onClick={() => signOut(auth)}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition text-sm"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
