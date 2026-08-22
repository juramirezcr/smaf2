<?php

namespace App\Support;

class PortaOneBillStatus
{
    /**
     * PortaOne devuelve bill_status como código de una letra (O/B/C) en algunos
     * métodos y como palabra completa en otros, según el servicio consultado.
     */
    public static function isClosed(?string $billStatus): bool
    {
        if ($billStatus === null || $billStatus === '') {
            return false;
        }

        $normalized = strtolower(trim($billStatus));

        if ($normalized === 'c') {
            return true;
        }

        return str_contains($normalized, 'clos') || str_contains($normalized, 'terminat');
    }
}
