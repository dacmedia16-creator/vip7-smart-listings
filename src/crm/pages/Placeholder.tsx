import { CrmLayout } from '../components/CrmLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function Placeholder({ title }: { title: string }) {
  return (
    <CrmLayout title={title}>
      <Card className="border-[#E8E4D9]">
        <CardContent className="py-16 text-center">
          <Construction className="h-12 w-12 text-[#C9B89A] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#0F0F12]">{title}</h2>
          <p className="text-sm text-[#2A2A30] mt-2 max-w-md mx-auto">
            Este módulo será implementado nas próximas entregas do plano.
          </p>
        </CardContent>
      </Card>
    </CrmLayout>
  );
}
