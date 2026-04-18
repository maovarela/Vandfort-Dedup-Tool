"use client";

import { useState } from "react";
import {
  ArrowRight,
  Database,
  Eye,
  KeyRound,
  Lock,
  Shield,
} from "lucide-react";

type ComingSoon = "hubspot" | "salesforce" | null;

export default function LandingPage() {
  const [comingSoon, setComingSoon] = useState<ComingSoon>(null);

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col items-start gap-6 pt-8">
        <span className="inline-flex items-center gap-2 rounded-vf border border-vf-border bg-vf-surface px-3 py-1 text-xs text-vf-text-2">
          <Shield className="h-3.5 w-3.5 text-vf-accent" />
          Tus datos nunca salen de tu navegador.
        </span>
        <h1 className="font-display text-5xl font-bold tracking-tight md:text-6xl">
          Encuentra y elimina
          <br />
          <span className="text-vf-accent">duplicados en tu CRM</span>.
        </h1>
        <p className="max-w-2xl text-lg text-vf-text-2">
          Vandfort Dedup conecta a tu HubSpot o Salesforce, detecta registros
          duplicados y te deja fusionarlos con un clic. Todo ocurre dentro de
          tu navegador. Nada se guarda en nuestros servidores. Nunca.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <ProviderCard
          name="HubSpot"
          description="Pega tu Private App Token. El token se queda en la memoria de esta pestaña y desaparece al cerrarla."
          onClick={() => setComingSoon("hubspot")}
          disabled={comingSoon !== null}
        />
        <ProviderCard
          name="Salesforce"
          description="Inicias sesión en tu propio Salesforce. Tu contraseña la tecleas allí — nosotros nunca la vemos."
          onClick={() => setComingSoon("salesforce")}
          disabled={comingSoon !== null}
        />
      </section>

      {comingSoon && (
        <div className="rounded-vf border border-vf-border bg-vf-surface p-4 text-sm text-vf-text-2">
          <span className="text-vf-accent">
            Conexión con {comingSoon === "hubspot" ? "HubSpot" : "Salesforce"}
          </span>{" "}
          disponible próximamente. El resto del flujo (escaneo, revisión,
          fusión) ya está diseñado — todo seguirá corriendo dentro de tu
          navegador.
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-3">
        <TrustCard
          icon={<Lock className="h-5 w-5" />}
          title="Tus datos nunca salen de tu navegador"
          body="Los registros se descargan directamente de tu CRM a tu pantalla. No pasan por ningún servidor de Vandfort."
        />
        <TrustCard
          icon={<KeyRound className="h-5 w-5" />}
          title="Tu token vive solo en esta pestaña"
          body="Cierras la pestaña y desaparece. No lo guardamos en ningún archivo, base de datos, ni registro."
        />
        <TrustCard
          icon={<Eye className="h-5 w-5" />}
          title="Cero telemetría"
          body="No medimos qué haces, cuántos registros tienes, ni qué empresas hay en tu CRM. Es tu herramienta, no la nuestra."
        />
      </section>

      <section className="flex flex-col gap-4 rounded-vf border border-vf-border bg-vf-surface p-6">
        <h2 className="font-display text-xl font-bold">
          ¿Cómo funciona en 6 pasos?
        </h2>
        <ol className="flex flex-col gap-3 text-sm text-vf-text-2">
          <Step n={1}>
            Conectas tu CRM con un token (HubSpot) o inicio de sesión
            (Salesforce).
          </Step>
          <Step n={2}>
            Eliges qué deduplicar: empresas o contactos, y qué campos comparar.
          </Step>
          <Step n={3}>
            La herramienta descarga tus registros directamente de tu CRM a esta
            pestaña. Puedes verificarlo con F12 → pestaña <em>Red</em>.
          </Step>
          <Step n={4}>
            Un motor local encuentra duplicados exactos y aproximados. Para los
            casos dudosos (opcional), consulta a Claude enviando solo nombre,
            dominio, país y teléfono — sin identificadores tuyos.
          </Step>
          <Step n={5}>
            Revisas los grupos lado a lado. Eliges cuál registro queda como
            primario y fusionas uno por uno, o en bloque.
          </Step>
          <Step n={6}>
            Cierras la pestaña. El token, los registros descargados y el
            historial local se borran automáticamente.
          </Step>
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-bold">
          Preguntas que todos se hacen
        </h2>
        <div className="flex flex-col divide-y divide-vf-border rounded-vf border border-vf-border bg-vf-surface">
          <FAQ
            q="¿Vandfort puede ver mis datos?"
            a="No. Los registros van directamente de HubSpot o Salesforce a tu navegador. No pasan por ningún servidor nuestro. Puedes comprobarlo en cualquier momento con las Herramientas de Desarrollador del navegador (F12 → Red)."
          />
          <FAQ
            q="¿Dónde se guarda mi token de HubSpot?"
            a="Solo en la memoria de esta pestaña del navegador. Cierras la pestaña y se borra. No va a ninguna base de datos, ni cookie, ni registro del servidor."
          />
          <FAQ
            q="¿Qué pasa si cierro la pestaña a la mitad del escaneo?"
            a="Los registros descargados se borran, que es lo que queremos. Tu CRM no se ve afectado: cada fusión es una llamada independiente que termina antes de pasar a la siguiente. Nada queda a medias."
          />
          <FAQ
            q="¿Qué envía a Claude si lo activo?"
            a="Solo nombre, dominio, país y teléfono de los pares de registros que el algoritmo duda — máximo el 5% de los grupos. No se envían IDs internos ni nada que identifique tu portal. Anthropic no entrena modelos con estos datos."
          />
          <FAQ
            q="¿Cumple con GDPR?"
            a="Sí. Vandfort no es procesador de tus datos, porque nunca los procesamos: nunca llegan a nosotros. Tu relación con HubSpot o Salesforce como responsable sigue siendo exactamente la misma."
          />
          <FAQ
            q="¿Y si mi equipo de IT pide revisar la herramienta?"
            a="Mándales esta URL. Desde el punto de vista de seguridad, Vandfort Dedup equivale a un script local ejecutado en el navegador. El código fuente está abierto para auditar."
          />
        </div>
      </section>
    </div>
  );
}

function ProviderCard({
  name,
  description,
  onClick,
  disabled,
}: {
  name: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-start gap-4 rounded-vf border border-vf-border bg-vf-surface p-6 text-left transition-colors hover:border-vf-border-h disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-vf bg-vf-surface-2 text-vf-accent">
        <Database className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold">Conectar {name}</h2>
        <p className="text-sm text-vf-text-2">{description}</p>
      </div>
      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-vf-accent transition-transform group-hover:translate-x-0.5">
        Continuar <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

function TrustCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-vf border border-vf-border bg-vf-surface p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-vf bg-vf-surface-2 text-vf-accent">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-vf-text">
        {title}
      </h3>
      <p className="text-sm text-vf-text-2">{body}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-vf-accent font-mono text-xs font-semibold text-vf-bg">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-vf-text">
        {q}
        <span className="text-vf-text-3 transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-3 text-sm text-vf-text-2">{a}</p>
    </details>
  );
}
