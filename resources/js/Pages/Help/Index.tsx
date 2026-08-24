import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { ReactNode, useState } from 'react';

interface HelpSectionData {
    id: string;
    title: string;
    audience: 'all' | 'admin';
    summary: string;
    body: ReactNode;
}

function Field({ name, children }: { name: string; children: ReactNode }) {
    return (
        <li>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{name}:</span> {children}
        </li>
    );
}

function Section({ section, open, onToggle }: { section: HelpSectionData; open: boolean; onToggle: () => void }) {
    return (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700"
            >
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{section.title}</h3>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{section.summary}</p>
                </div>
                <svg
                    className={`h-5 w-5 shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${open ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
            </button>
            {open && (
                <div className="space-y-3 border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    {section.body}
                </div>
            )}
        </div>
    );
}

const SECTIONS: HelpSectionData[] = [
    {
        id: 'dashboard',
        title: 'Actual (Panel principal)',
        audience: 'all',
        summary: 'Vista general del tráfico del período: totales, gráficos y comparativos.',
        body: (
            <>
                <p>
                    Es la pantalla de inicio del sistema. Resume, para el período seleccionado, cuánto tráfico ha
                    generado cada prefijo, destino y cuenta, con gráficos de dona y una mini gráfica de histórico
                    (sparkline) por fila para ver la tendencia de los últimos días de un vistazo.
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                    <Field name="Período">
                        Selector para cambiar el rango de tiempo que se está analizando (hoy, últimos días, etc.).
                    </Field>
                    <Field name="Gráficos de dona">
                        Muestran la proporción de llamadas por prefijo/país y ayudan a detectar rápidamente hacia
                        dónde se concentra el tráfico.
                    </Field>
                    <Field name="Destinos y Cuentas">
                        Se agrupan por Cliente interno si eres administrador, o por Customer si eres un usuario del
                        cliente — así cada quien ve la información relevante a su alcance.
                    </Field>
                    <Field name="Histórico (sparkline)">
                        Pequeña gráfica de línea junto a cada fila que muestra cómo ha variado esa cuenta o destino
                        en los días recientes, útil para notar picos o caídas de tráfico.
                    </Field>
                    <Field name="Auto-actualización">
                        El panel se refresca solo cada cierto tiempo para reflejar datos casi en tiempo real.
                    </Field>
                </ul>
            </>
        ),
    },
    {
        id: 'calls',
        title: 'Llamadas',
        audience: 'all',
        summary: 'Llamadas activas en curso en este momento, en tiempo real.',
        body: (
            <>
                <p>
                    Muestra las llamadas que están sucediendo ahora mismo según PortaOne (se consulta cada minuto).
                    Es útil para vigilar el tráfico en vivo, por ejemplo para confirmar que una cuenta está generando
                    llamadas o para detectar un volumen anormal mientras ocurre.
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                    <Field name="Cliente (interno del sistema)">
                        Solo visible para administradores: identifica a qué cliente de SMAF2 pertenece la cuenta.
                    </Field>
                    <Field name="Customer / Account">
                        El cliente final de PortaOne y la cuenta/extensión específica que está realizando la llamada.
                    </Field>
                    <Field name="Desde / Hacia (CLI / CLD)">Número que origina la llamada y número destino marcado.</Field>
                    <Field name="Prefijo / País">Prefijo internacional detectado en el destino y el país asociado.</Field>
                    <Field name="Conectada">Hora en la que la llamada estableció conexión.</Field>
                    <Field name="Segundos">Duración transcurrida de la llamada hasta el momento.</Field>
                    <Field name="Agrupar por">
                        Permite agrupar la lista por cliente, customer o cuenta para ver de un vistazo cuántas
                        llamadas simultáneas tiene cada uno, junto con un sparkline de llamadas en las últimas 24
                        horas por customer.
                    </Field>
                </ul>
            </>
        ),
    },
    {
        id: 'prefixes',
        title: 'Prefijos',
        audience: 'all',
        summary: 'Reglas de monitoreo por prefijo: límites de llamadas y duración que disparan alertas.',
        body: (
            <>
                <p>
                    Aquí se definen las reglas que el sistema evalúa cada 5 minutos para decidir si una cuenta se
                    está comportando de forma anómala en un prefijo/destino determinado (posible fraude, uso
                    excesivo, etc.). Cuando una cuenta supera los límites configurados en la última hora, se genera
                    una alerta (ver sección Alertas) y, si están configuradas, se envían notificaciones por Telegram
                    y/o correo.
                </p>
                <p>
                    Las reglas pueden ser <strong>globales</strong> (aplican a todos los clientes) o específicas de
                    un cliente, y estas últimas tienen prioridad sobre la regla global equivalente para ese mismo
                    prefijo.
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                    <Field name="Prefijo">Código de país/destino al que aplica la regla (ej. 506 para Costa Rica).</Field>
                    <Field name="País / Descripción">Etiquetas informativas para identificar la regla fácilmente.</Field>
                    <Field name="Cuenta / Customer (opcional)">
                        Si se especifican, la regla solo aplica a esa cuenta o customer puntual; si se dejan vacíos,
                        aplica a cualquier cuenta que llame a ese prefijo.
                    </Field>
                    <Field name="Límite de llamadas por hora">
                        Cantidad máxima de llamadas permitidas hacia ese prefijo en una hora antes de generar alerta.
                    </Field>
                    <Field name="Límite de minutos por hora">
                        Duración total acumulada (en minutos) permitida hacia ese prefijo en una hora.
                    </Field>
                    <Field name="Acción">
                        <em>Notificar</em> solo avisa del exceso; <em>Bloquear</em> está pensado para marcar que la
                        cuenta debería bloquearse (la notificación indica cuál acción corresponde).
                    </Field>
                    <Field name="Habilitada">Permite desactivar una regla temporalmente sin borrarla.</Field>
                </ul>
                <p>La lista se agrupa de forma colapsable por Cliente y luego por País para facilitar la navegación.</p>
            </>
        ),
    },
    {
        id: 'destinations',
        title: 'Destinos',
        audience: 'all',
        summary: 'Reporte de tráfico agrupado por país/prefijo de destino.',
        body: (
            <>
                <p>
                    Reporte jerárquico y colapsable: Cliente → Prefijo → Destino → Customer → Account. Permite ver,
                    para un período determinado, hacia qué destinos se está llamando más y desglosar hasta llegar a
                    qué cuenta específica generó ese tráfico.
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                    <Field name="Período">Filtra el reporte a un rango de fechas específico.</Field>
                    <Field name="Buscar destino">Filtra la lista por número o nombre de destino/país.</Field>
                    <Field name="Llamadas / Segundos">
                        Totales acumulados en cada nivel de la jerarquía (destino, customer o cuenta).
                    </Field>
                </ul>
            </>
        ),
    },
    {
        id: 'accounts',
        title: 'Cuentas',
        audience: 'all',
        summary: 'Listado y estado de las cuentas/extensiones registradas en PortaOne.',
        body: (
            <>
                <p>
                    Es el listado (registro) de las cuentas que existen en PortaOne para cada customer, no un
                    reporte de tráfico. Sirve para consultar rápidamente qué cuentas existen, a qué producto
                    pertenecen y su estado de facturación.
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                    <Field name="Cliente (interno del sistema)">Solo administradores: cliente de SMAF2 dueño de la cuenta.</Field>
                    <Field name="Customer">Cliente final de PortaOne al que pertenece la cuenta.</Field>
                    <Field name="Account">Identificador de la cuenta/extensión.</Field>
                    <Field name="Producto">Plan o producto de PortaOne asignado a la cuenta.</Field>
                    <Field name="Estado">
                        Estado de facturación de la cuenta (activa, suspendida, bloqueada, etc.), mostrado con una
                        etiqueta de color.
                    </Field>
                    <Field name="Buscar / Filtrar por cliente">Permite ubicar una cuenta específica rápidamente.</Field>
                </ul>
            </>
        ),
    },
    {
        id: 'customers',
        title: 'Customers',
        audience: 'all',
        summary: 'Clientes finales de PortaOne y sus cuentas asociadas.',
        body: (
            <>
                <p>
                    Muestra los <em>customers</em> (clientes finales dentro de PortaOne) sincronizados, y al entrar a
                    uno se puede ver el detalle de sus cuentas y el historial de llamadas de cada una.
                </p>
            </>
        ),
    },
    {
        id: 'alerts',
        title: 'Alertas',
        audience: 'all',
        summary: 'Historial de alertas generadas cuando una cuenta supera los límites configurados.',
        body: (
            <>
                <p>
                    Cada vez que el sistema evalúa las reglas de Prefijos y encuentra que una cuenta superó el
                    límite de llamadas o de duración en la última hora, se crea un registro aquí. Si el cliente
                    tiene configurado un Chat ID de Telegram y/o un correo, también recibe la notificación
                    correspondiente en ese momento.
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                    <Field name="Fecha">Momento en que se generó la alerta.</Field>
                    <Field name="Cliente">Solo cuando se ven todos los clientes: a quién pertenece la alerta.</Field>
                    <Field name="Cuenta / Customer">La cuenta y customer que dispararon la alerta.</Field>
                    <Field name="Regla">Prefijo/regla de Prefijos que se incumplió.</Field>
                    <Field name="Llamadas / Segundos">
                        Cantidad de llamadas y segundos acumulados que provocaron el exceso, para comparar contra el
                        límite configurado en la regla.
                    </Field>
                    <Field name="Acción">Si la regla estaba configurada para notificar o para bloquear.</Field>
                    <Field name="Estado">Si la notificación (Telegram/correo) se envió correctamente.</Field>
                </ul>
            </>
        ),
    },
    {
        id: 'clients',
        title: 'Clientes',
        audience: 'admin',
        summary: 'Alta y configuración de cada cliente de SMAF2: credenciales, notificaciones y usuarios.',
        body: (
            <>
                <p>
                    Administra los clientes que usan la plataforma. Cada cliente tiene su propia conexión a
                    PortaOne, sus propios usuarios y su propia configuración de notificaciones de alertas.
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                    <Field name="Partición / entorno PortaOne, Usuario API, Clave API">
                        Credenciales que SMAF2 usa para conectarse a la cuenta de ese cliente en PortaOne. Se pueden
                        probar con el botón "Probar conexión" antes de sincronizar.
                    </Field>
                    <Field name="Chat ID de Telegram">
                        Identificador del chat de Telegram del cliente donde se enviarán las alertas (se obtiene
                        escribiéndole al bot y consultando su Chat ID).
                    </Field>
                    <Field name="Usar un bot de Telegram propio">
                        Si el cliente prefiere que las alertas lleguen desde su propio bot de Telegram en vez del bot
                        general del sistema, se activa esta opción y se coloca el token de ese bot.
                    </Field>
                    <Field name="Correo para notificaciones">Dirección de correo que recibirá el detalle de cada alerta.</Field>
                    <Field name="Probar (Telegram / Correo)">
                        Envía un mensaje de ejemplo con datos ficticios para confirmar que la configuración
                        realmente funciona antes de depender de ella.
                    </Field>
                    <Field name="Sincronizar ahora">Fuerza una sincronización inmediata de productos, customers, cuentas y llamadas con PortaOne.</Field>
                    <Field name="Usuarios">
                        Cada cliente puede tener varios usuarios; el primero se crea junto con el cliente como
                        "Administrador del cliente" y desde ahí se pueden agregar más.
                    </Field>
                </ul>
            </>
        ),
    },
    {
        id: 'portaone',
        title: 'PortaOne',
        audience: 'admin',
        summary: 'URL de conexión compartida hacia el servidor PortaOne.',
        body: (
            <>
                <p>
                    Configura la dirección raíz del servidor SOAP de PortaOne, la misma para todos los clientes. Las
                    credenciales específicas de cada cliente (usuario, clave, partición) se configuran en la
                    pantalla de Clientes, no aquí.
                </p>
            </>
        ),
    },
    {
        id: 'telegram',
        title: 'Telegram',
        audience: 'admin',
        summary: 'Bot general de notificaciones y canal de alertas para el equipo de administración.',
        body: (
            <>
                <ul className="list-disc space-y-1.5 pl-5">
                    <Field name="Token del bot">
                        Token entregado por @BotFather al crear el bot de Telegram. Es el bot que usan todos los
                        clientes que no tengan activado su propio bot personalizado.
                    </Field>
                    <Field name="Chat ID de administración">
                        Chat separado (no de un cliente) que recibe avisos operativos: pérdida de conexión con
                        PortaOne, o cualquier job en segundo plano que haya fallado definitivamente. Tiene su propio
                        botón de prueba.
                    </Field>
                </ul>
            </>
        ),
    },
    {
        id: 'email',
        title: 'Email',
        audience: 'admin',
        summary: 'Servidor SMTP usado para enviar las alertas por correo.',
        body: (
            <>
                <p>
                    Configuración de envío (host, puerto, cifrado, usuario, contraseña y remitente) usada para
                    enviar el correo de alerta a los clientes que tengan un correo de notificación configurado. Cada
                    cliente define su propio correo destino en la pantalla de Clientes.
                </p>
            </>
        ),
    },
    {
        id: 'platform-users',
        title: 'Administradores',
        audience: 'admin',
        summary: 'Cuentas con acceso administrativo a todo el sistema (no pertenecen a un cliente).',
        body: (
            <>
                <p>
                    Gestiona los usuarios que pueden administrar SMAF2 en su totalidad (todos los clientes,
                    configuraciones globales, etc.), a diferencia de los usuarios de un cliente que solo ven su
                    propia información.
                </p>
            </>
        ),
    },
    {
        id: 'queue',
        title: 'Cola de jobs',
        audience: 'admin',
        summary: 'Monitor de tareas en segundo plano: sincronizaciones, alertas, importaciones.',
        body: (
            <>
                <p>
                    SMAF2 hace la mayoría de su trabajo pesado (sincronizar con PortaOne, evaluar alertas, enviar
                    notificaciones) en jobs que corren en segundo plano. Esta pantalla permite ver cuáles están
                    pendientes, cuáles fallaron y por qué, y reintentarlos o descartarlos.
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                    <Field name="Pendientes">Jobs en espera de ser procesados por el worker.</Field>
                    <Field name="Fallidos">
                        Jobs que agotaron sus reintentos; muestra el error para diagnosticar la causa (por ejemplo,
                        una falla de conexión con PortaOne).
                    </Field>
                    <Field name="Reintentar / Descartar">Vuelve a encolar un job fallido, o lo elimina definitivamente.</Field>
                </ul>
            </>
        ),
    },
    {
        id: 'users',
        title: 'Usuarios',
        audience: 'admin',
        summary: 'Usuarios del propio cliente (visible para administradores de cliente).',
        body: (
            <>
                <p>
                    Permite a un administrador de cliente crear y gestionar los demás usuarios de su misma empresa,
                    asignándoles el rol de administrador o de usuario estándar.
                </p>
            </>
        ),
    },
    {
        id: 'process-runs',
        title: 'Ejecuciones',
        audience: 'all',
        summary: 'Historial de sincronizaciones con PortaOne: cuándo corrieron y si tuvieron éxito.',
        body: (
            <>
                <p>
                    Registro histórico de cada sincronización de datos con PortaOne (productos, customers, cuentas,
                    llamadas): cuándo empezó, cuándo terminó, y si finalizó correctamente o con error.
                </p>
            </>
        ),
    },
    {
        id: 'releases',
        title: 'Actualizaciones',
        audience: 'admin',
        summary: 'Despliegue de nuevas versiones del sistema.',
        body: (
            <>
                <p>Permite revisar y disparar el despliegue de una nueva versión de SMAF2 en el servidor.</p>
            </>
        ),
    },
];

export default function HelpIndex() {
    const user = usePage().props.auth.user;
    const isAdmin = user.isSystemAdmin || user.role === 'client_admin';
    const visibleSections = SECTIONS.filter((section) => section.audience === 'all' || isAdmin);

    const [openIds, setOpenIds] = useState<Set<string>>(new Set());

    const toggle = (id: string) => {
        setOpenIds((previous) => {
            const next = new Set(previous);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Ayuda</h2>}>
            <Head title="Ayuda" />
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    Guía rápida de cada sección del sistema: para qué sirve y qué significa cada campo. Haz clic en
                    una sección para expandirla.
                </p>
                <div className="space-y-3">
                    {visibleSections.map((section) => (
                        <Section key={section.id} section={section} open={openIds.has(section.id)} onToggle={() => toggle(section.id)} />
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
