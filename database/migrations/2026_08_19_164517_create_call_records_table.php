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
        Schema::create('call_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('import_batch_id')->constrained()->cascadeOnDelete();
            $table->string('external_id');
            $table->string('account');
            $table->string('customer')->nullable();
            $table->string('origin', 32)->nullable();
            $table->string('destination', 32);
            $table->string('prefix', 16)->nullable();
            $table->string('country_code', 8)->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->timestamp('connected_at');
            $table->timestamps();

            $table->unique(['user_id', 'external_id']);
            $table->index(['user_id', 'connected_at']);
            $table->index(['user_id', 'prefix', 'connected_at']);
            $table->index(['user_id', 'account', 'connected_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('call_records');
    }
};
