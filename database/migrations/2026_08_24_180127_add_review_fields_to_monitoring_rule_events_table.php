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
        Schema::table('monitoring_rule_events', function (Blueprint $table) {
            $table->string('review_status')->default('pending')->after('status');
            $table->text('feedback_notes')->nullable()->after('review_status');
            $table->foreignId('reviewed_by')->nullable()->after('feedback_notes')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('monitoring_rule_events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['review_status', 'feedback_notes', 'reviewed_at']);
        });
    }
};
