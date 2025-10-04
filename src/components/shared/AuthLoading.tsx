export default function AuthLoading() {
  return (
    <div className="app-shell min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="brand-gradient w-16 h-16 rounded-full animate-pulse" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
