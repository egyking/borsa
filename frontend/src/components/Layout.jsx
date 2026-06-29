import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={22} />
            <h1 className="text-lg font-bold">بورصة</h1>
            <span className="text-gray-500 text-xs hidden sm:inline">مستشار أسهم وذهب السوق المصري</span>
          </Link>
          <span className="text-gray-500 text-xs">تحديث يومي آلي</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
