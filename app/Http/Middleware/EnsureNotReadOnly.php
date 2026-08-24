<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNotReadOnly
{
    /**
     * Bloquea cualquier método que modifique datos para un administrador
     * marcado como solo lectura. Las peticiones de solo lectura (GET/HEAD)
     * siempre pasan, así que esta clase puede colgarse de cualquier grupo de
     * rutas sin afectar la navegación normal.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->read_only && ! $request->isMethod('GET') && ! $request->isMethod('HEAD')) {
            abort(403, 'Tu cuenta es de solo lectura.');
        }

        return $next($request);
    }
}
