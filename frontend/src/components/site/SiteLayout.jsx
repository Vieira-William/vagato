import SiteNavbar from './SiteNavbar';
import SiteFooter from './SiteFooter';

export default function SiteLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
