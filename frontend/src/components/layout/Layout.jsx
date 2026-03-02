import TopNav from './TopNav';

export default function Layout({ children }) {
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

      <TopNav />

      {/* Spacer para o Header fragmentado */}
      <div className="pt-20 flex-1 flex flex-col px-6 pb-6 relative z-10 w-full max-w-7xl mx-auto overflow-hidden">
        <main className="flex-1 w-full flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
