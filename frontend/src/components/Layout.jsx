import { TrendingUp, BookOpen, Landmark } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Layout({ children }) {
  const { pathname } = useLocation();

  function navClass(path) {
    const active = pathname === path;
    return `flex items-center gap-1.5 transition text-sm px-2 py-1 rounded-lg ${
      active
        ? "text-emerald-400 bg-emerald-400/10"
        : "text-gray-400 hover:text-white"
    }`;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={22} />
            <h1 className="text-lg font-bold">بورصة</h1>
            <span className="text-gray-500 text-xs hidden sm:inline">مستشار أسهم وذهب السوق المصري</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/funds" className={navClass("/funds")}>
              <Landmark size={15} />
              <span className="hidden sm:inline">صناديق</span>
            </Link>
            <Link to="/journal" className={navClass("/journal")}>
              <BookOpen size={15} />
              <span className="hidden sm:inline">دفتر صفقاتي</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
