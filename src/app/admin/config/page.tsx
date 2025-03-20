import { ConfigurationDashboard } from '@/components/admin/ConfigurationDashboard';

export default function ConfigPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Nature Scout Konfiguration</h1>
      <ConfigurationDashboard />
    </div>
  );
} 