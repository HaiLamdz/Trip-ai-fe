import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100vh', background: '#f5f6fa', display: 'flex', overflow: 'hidden' }}>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="dashboard-main">
        {/* Desktop-only top navbar */}
        <div className="desktop-navbar">
          <Navbar />
        </div>
        {children}
      </main>

      <style>{`
        /* Desktop: show sidebar + top navbar */
        .desktop-sidebar { display: flex; }
        .desktop-navbar  { display: block; }
        .dashboard-main {
          flex: 1;
          overflow-y: auto;
          padding: 28px 32px;
        }

        /* Mobile: hide sidebar and desktop navbar — page renders its own header + bottom nav */
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .desktop-navbar  { display: none !important; }
          .dashboard-main  { padding: 0; }
        }
      `}</style>
    </div>
  );
}
