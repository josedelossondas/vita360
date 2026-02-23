import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet } from 'react-router';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="ml-[220px] mt-[60px] p-6">
        <Outlet />
      </main>
    </div>
  );
}
