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
        Schema::create('portaone_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('i_product');
            $table->string('name');
            $table->string('end_user_name')->nullable();
            $table->boolean('is_telephony')->default(false);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['client_id', 'i_product']);
        });

        Schema::create('portaone_customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('i_customer');
            $table->string('name')->nullable();
            $table->string('company_name')->nullable();
            $table->string('email')->nullable();
            $table->string('bill_status')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['client_id', 'i_customer']);
        });

        Schema::create('portaone_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('i_account');
            $table->unsignedBigInteger('i_customer')->nullable();
            $table->string('account_id')->nullable();
            $table->unsignedBigInteger('i_product')->nullable();
            $table->string('product_name')->nullable();
            $table->string('bill_status')->nullable();
            $table->string('blocked')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['client_id', 'i_account']);
            $table->index(['client_id', 'i_customer']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('portaone_accounts');
        Schema::dropIfExists('portaone_customers');
        Schema::dropIfExists('portaone_products');
    }
};
