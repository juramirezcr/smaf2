<?php

use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('portaone_environment');
            $table->string('portaone_username');
            $table->text('portaone_token');
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->enum('role', ['client_admin', 'client_user'])->default('client_user')->after('password');
            $table->index(['client_id', 'role']);
        });

        foreach (['import_batches', 'call_records', 'monitoring_rules', 'monitoring_rule_events', 'process_runs'] as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $table) {
                    $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
                    $table->index('client_id');
                });
            }
        }

        foreach (User::query()->whereNull('client_id')->cursor() as $user) {
            $client = Client::create([
                'name' => "Cliente migrado {$user->id}",
                'portaone_environment' => 'legacy',
                'portaone_username' => 'legacy',
                'portaone_token' => 'legacy',
            ]);

            $user->update(['client_id' => $client->id, 'role' => 'client_admin']);

            foreach (['import_batches', 'call_records', 'monitoring_rules', 'monitoring_rule_events', 'process_runs'] as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)
                        ->where('user_id', $user->id)
                        ->update(['client_id' => $client->id]);
                }
            }

            Schema::table('call_records', function (Blueprint $table) {
                $table->dropUnique(['user_id', 'external_id']);
                $table->unique(['client_id', 'external_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::table('call_records', function (Blueprint $table) {
            $table->dropUnique(['client_id', 'external_id']);
            $table->unique(['user_id', 'external_id']);
        });

        foreach (['import_batches', 'call_records', 'monitoring_rules', 'monitoring_rule_events', 'process_runs'] as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropConstrainedForeignId('client_id');
                });
            }
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['client_id', 'role']);
            $table->dropConstrainedForeignId('client_id');
            $table->dropColumn('role');
        });

        Schema::dropIfExists('clients');
    }
};
