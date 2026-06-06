import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { signOut } from '../hooks/useAuth';

export default function SemAcesso() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-[#0F0F12]">Acesso pendente</h1>
        <p className="text-[#2A2A30]">
          Sua conta foi criada, mas ainda não possui um perfil ativo no CRM. Solicite a um administrador
          para liberar seu acesso.
        </p>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            onClick={async () => {
              await signOut();
              window.location.href = '/crm/login';
            }}
          >
            Sair
          </Button>
          <Link to="/">
            <Button variant="default" className="bg-[#C9A24C] hover:bg-[#B08F3D] text-white">Voltar ao site</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
