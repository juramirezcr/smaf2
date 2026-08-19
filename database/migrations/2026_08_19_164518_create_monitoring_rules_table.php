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
        Schema::create('monitoring_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('scope', ['prefix', 'account_prefix', 'destination']);
            $table->string('match_value');
            $table->unsignedInteger('call_limit')->nullable();
            $table->unsignedInteger('duration_limit_seconds')->nullable();
            $table->enum('action', ['ignore', 'notify', 'block'])->default('notify');
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'scope', 'enabled']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monitoring_rules');
    }
};
