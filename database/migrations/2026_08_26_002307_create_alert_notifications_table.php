<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alert_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitoring_rule_event_id')->constrained()->cascadeOnDelete();
            $table->enum('channel', ['telegram', 'email']);
            $table->string('recipient')->nullable();
            $table->enum('status', ['sent', 'failed']);
            $table->text('error')->nullable();
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->index(['monitoring_rule_event_id', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_notifications');
    }
};
