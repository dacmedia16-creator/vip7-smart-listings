import { CrmLayout } from '../components/CrmLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function Placeholder({ title }: { title: string }) {
  return (
    <CrmLayout title={title}>
      <Card className="border-slate-200">
        <CardContent className="py-16 text-center">
          <Construction className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            Este módulo será implementado nas próximas entregas do plano.
          </p>
        </CardContent>
      </Card>
    </CrmLayout>
  );
}
