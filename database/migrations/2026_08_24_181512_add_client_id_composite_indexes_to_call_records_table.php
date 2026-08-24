<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // call_records solo tenía un índice simple en client_id (más los
        // compuestos legacy sobre user_id); todo el dashboard y los nuevos
        // modales de histórico filtran por client_id + prefix/account +
        // connected_at, así que sin estos índices compuestos MySQL termina
        // escaneando de más en clientes con muchas llamadas.
        Schema::table('call_records', function (Blueprint $table) {
            $table->index(['client_id', 'connected_at']);
            $table->index(['client_id', 'prefix', 'connected_at']);
            $table->index(['client_id', 'account', 'connected_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('call_records', function (Blueprint $table) {
            $table->dropIndex(['client_id', 'connected_at']);
            $table->dropIndex(['client_id', 'prefix', 'connected_at']);
            $table->dropIndex(['client_id', 'account', 'connected_at']);
        });
    }
};
