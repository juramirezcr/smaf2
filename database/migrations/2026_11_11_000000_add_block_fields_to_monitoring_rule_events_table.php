<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('monitoring_rule_events', function (Blueprint $table) {
            // null = no aplica; blocked | failed | unblocked | unblock_failed
            $table->string('block_status')->nullable()->after('review_status');
            $table->text('block_error')->nullable()->after('block_status');
            $table->timestamp('blocked_at')->nullable()->after('block_error');
        });
    }

    public function down(): void
    {
        Schema::table('monitoring_rule_events', function (Blueprint $table) {
            $table->dropColumn(['block_status', 'block_error', 'blocked_at']);
        });
    }
};
