import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { CompareProvider } from "@/contexts/CompareContext";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import NotFound from "@/pages/NotFound";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "UTF-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "VIP7 Imóveis | Imóveis de Alto Padrão em Sorocaba" },
      {
        name: "description",
        content:
          "Especialistas em venda e locação de imóveis de médio e alto padrão em Sorocaba e região. Encontre casas, apartamentos e condomínios exclusivos.",
      },
      { name: "author", content: "VIP7 Imóveis" },
      { property: "og:title", content: "VIP7 Imóveis | Imóveis de Alto Padrão" },
      {
        property: "og:description",
        content: "Especialistas em venda e locação de imóveis de alto padrão em Sorocaba",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "VIP7 Imóveis" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@vip7imoveis" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400;1,9..40,500&display=swap",
      },
    ],
    scripts: [
      {
        // ported from main.tsx: converte hash route (/#/path) para path real (/path).
        // Necessário porque o og-metadata redireciona para /#/imovel/X.
        children:
          "if (window.location.hash && window.location.hash.indexOf('#/') === 0) { window.location.replace(window.location.hash.slice(1)); }",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FavoritesProvider>
          <CompareProvider>
            <Toaster />
            <Sonner />
            <Outlet />
          </CompareProvider>
        </FavoritesProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="mb-2 font-heading text-2xl text-foreground">Esta página não carregou</h1>
        <p className="mb-6 text-muted-foreground">
          Algo deu errado do nosso lado. Você pode tentar novamente ou voltar para a página inicial.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Tentar novamente
          </button>
          <a
            className="rounded-lg border border-border bg-card px-4 py-2 font-medium text-foreground"
            href="/"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}
