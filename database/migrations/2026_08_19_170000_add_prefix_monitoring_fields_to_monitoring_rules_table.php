<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('monitoring_rules', function (Blueprint $table) {
            $table->string('account')->nullable()->after('match_value');
            $table->string('customer')->nullable()->after('account');
            $table->string('country', 80)->nullable()->after('customer');
            $table->string('description', 500)->nullable()->after('country');
            $table->timestamp('last_evaluated_at')->nullable()->after('enabled');

            $table->index(['user_id', 'account', 'enabled']);
            $table->index(['user_id', 'customer', 'enabled']);
        });
    }

    public function down(): void
    {
        Schema::table('monitoring_rules', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'account', 'enabled']);
            $table->dropIndex(['user_id', 'customer', 'enabled']);
            $table->dropColumn([
                'account',
                'customer',
                'country',
                'description',
                'last_evaluated_at',
            ]);
        });
    }
};
