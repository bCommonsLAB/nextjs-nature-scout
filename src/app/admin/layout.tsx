
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return (
    <div className="min-h-screen">
      <div className="bg-gray-100 py-4 px-6 border-b border-gray-200">
        <h1 className="text-lg font-semibold">Admin-Bereich</h1>
      </div>
      {children}
    </div>
  );
} 