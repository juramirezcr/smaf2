<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('call_records', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->unsignedBigInteger('import_batch_id')->nullable()->change();
            $table->unsignedBigInteger('i_xdr')->nullable()->after('client_id');
            $table->unsignedBigInteger('i_customer')->nullable()->after('i_xdr');
            $table->unsignedBigInteger('i_account')->nullable()->after('i_customer');

            $table->index(['client_id', 'i_account']);
            $table->index(['client_id', 'i_customer']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->timestamp('xdr_synced_until')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('call_records', function (Blueprint $table) {
            $table->dropIndex(['client_id', 'i_account']);
            $table->dropIndex(['client_id', 'i_customer']);
            $table->dropColumn(['i_xdr', 'i_customer', 'i_account']);
            $table->foreignId('user_id')->nullable(false)->change();
            $table->foreignId('import_batch_id')->nullable(false)->change();
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('xdr_synced_until');
        });
    }
};
