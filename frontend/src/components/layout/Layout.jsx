import { useLayoutMode } from '../../contexts/LayoutModeContext';
import NavigationShell from './NavigationShell';

export default function Layout({ children }) {
  const { mode } = useLayoutMode();
  const isTop = mode === 'topnav';

  return (
    <div
      className="h-screen flex flex-col text-foreground relative overflow-hidden transition-colors duration-500 font-['Outfit']"
      style={{
        background: `
          radial-gradient(ellipse at 90% -10%, rgba(55, 93, 251, 0.35) 0%, transparent 70%),
          radial-gradient(circle at -10% 110%, rgba(55, 93, 251, 0.10) 0%, transparent 50%),
          #E4E6E7
        `
      }}
    >
      {/* Raio de Sol */}
      <div className="bg-sunbeam" />

      <NavigationShell />

      {/* Content area — animated padding based on layout mode */}
      <div
        className="flex-1 flex flex-col pb-8 relative z-10 w-full mx-auto min-h-0"
        style={{
          paddingTop: isTop ? 80 : 16,
          paddingLeft: isTop ? 0 : 272,
          paddingRight: isTop ? 0 : 32,
          transition: 'padding 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Responsive horizontal padding in topnav mode via className */}
        <main className={`flex-1 w-full flex flex-col min-h-0 ${isTop ? 'px-8' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
