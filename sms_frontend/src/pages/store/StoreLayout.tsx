import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Truck, ShoppingCart, AlertTriangle,
  ChevronLeft, Store, UtensilsCrossed, Briefcase
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/modules/store', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/modules/store/items', label: 'All Items', icon: Package },
  { to: '/modules/store/items?type=FOOD', label: 'Food Store', icon: UtensilsCrossed },
  { to: '/modules/store/items?type=OFFICE', label: 'Office Store', icon: Briefcase },
  { to: '/modules/store/movements', label: 'Stock Movements', icon: Truck },
  { to: '/modules/store/orders', label: 'Order Requests', icon: ShoppingCart },
  { to: '/modules/store/low-stock', label: 'Low Stock', icon: AlertTriangle },
];

export default function StoreLayout() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors mb-3"
          >
            <ChevronLeft size={14} />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Store size={18} className="text-emerald-400" />
            <span className="font-semibold text-slate-100">Store & Inventory</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
        <Outlet />
      </main>
    </div>
  );
}
