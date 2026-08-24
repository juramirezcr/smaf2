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
        Schema::create('system_metrics', function (Blueprint $table) {
            $table->id();
            $table->timestamp('recorded_at')->index();
            $table->unsignedSmallInteger('cpu_cores')->nullable();
            $table->float('cpu_load_1m')->nullable();
            $table->float('cpu_load_5m')->nullable();
            $table->float('cpu_load_15m')->nullable();
            $table->unsignedInteger('mem_total_mb')->nullable();
            $table->unsignedInteger('mem_used_mb')->nullable();
            $table->float('disk_total_gb')->nullable();
            $table->float('disk_used_gb')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_metrics');
    }
};
