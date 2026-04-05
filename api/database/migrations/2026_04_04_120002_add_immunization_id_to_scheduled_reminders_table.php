<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scheduled_reminders', function (Blueprint $table) {
            $table->foreignId('immunization_id')
                ->nullable()
                ->after('vaccine_id')
                ->constrained('immunizations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('scheduled_reminders', function (Blueprint $table) {
            $table->dropForeign(['immunization_id']);
            $table->dropColumn('immunization_id');
        });
    }
};
