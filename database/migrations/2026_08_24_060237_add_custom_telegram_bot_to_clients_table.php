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
        Schema::table('clients', function (Blueprint $table) {
            $table->boolean('use_custom_telegram_bot')->default(false)->after('notification_email');
            $table->text('telegram_bot_token')->nullable()->after('use_custom_telegram_bot');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['use_custom_telegram_bot', 'telegram_bot_token']);
        });
    }
};
