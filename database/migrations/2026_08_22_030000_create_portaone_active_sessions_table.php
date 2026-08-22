<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portaone_active_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('call_id');
            $table->unsignedBigInteger('i_account')->nullable();
            $table->unsignedBigInteger('i_customer')->nullable();
            $table->string('account_id')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('cli')->nullable();
            $table->string('cld')->nullable();
            $table->string('country')->nullable();
            $table->timestamp('connect_time')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->timestamp('last_seen_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->unique(['client_id', 'call_id']);
            $table->index(['client_id', 'i_account']);
            $table->index(['client_id', 'i_customer']);
            $table->index(['client_id', 'ended_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portaone_active_sessions');
    }
};
