<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->unsignedBigInteger('legacy_user_id')->nullable()->unique()->after('id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('legacy_sub_user_id')->nullable()->unique()->after('id');
            $table->string('username')->nullable()->after('name');
        });

        DB::table('users')->orderBy('id')->each(function (object $user): void {
            DB::table('users')->where('id', $user->id)->update(['username' => $user->email]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('username');
            $table->dropUnique(['email']);
            $table->unique(['client_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['client_id', 'email']);
            $table->unique('email');
            $table->dropUnique(['username']);
            $table->dropColumn(['legacy_sub_user_id', 'username']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropUnique(['legacy_user_id']);
            $table->dropColumn('legacy_user_id');
        });
    }
};
