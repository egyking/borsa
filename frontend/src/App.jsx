import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import StockDetail from "./pages/StockDetail";
import GoldDetail from "./pages/GoldDetail";
import Journal from "./pages/Journal";
import Funds from "./pages/Funds";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stock/:symbol" element={<StockDetail />} />
        <Route path="/gold" element={<GoldDetail />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/funds" element={<Funds />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
