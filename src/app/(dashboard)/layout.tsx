import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100vh', background: '#0d1117', display: 'flex', overflow: 'hidden' }}>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="dashboard-main">
        {/* Mobile navbar — hidden on desktop */}
        <div className="mobile-navbar">
          <Navbar />
        </div>
        {children}
      </main>

      <style>{`
        /* Desktop: show sidebar, hide mobile navbar */
        .desktop-sidebar { display: flex; }
        .mobile-navbar   { display: none; }
        .dashboard-main {
          flex: 1;
          overflow-y: auto;
          padding: 28px 32px;
        }

        /* Mobile: hide sidebar, show navbar at top */
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-navbar   { display: block !important; }
          .dashboard-main  { padding: 0; }
        }
      `}</style>
    </div>
  );
}
