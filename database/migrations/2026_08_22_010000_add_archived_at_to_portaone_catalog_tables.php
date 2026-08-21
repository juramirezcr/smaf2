<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portaone_customers', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('bill_status');
        });

        Schema::table('portaone_accounts', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('bill_status');
        });
    }

    public function down(): void
    {
        Schema::table('portaone_customers', function (Blueprint $table) {
            $table->dropColumn('archived_at');
        });

        Schema::table('portaone_accounts', function (Blueprint $table) {
            $table->dropColumn('archived_at');
        });
    }
};
