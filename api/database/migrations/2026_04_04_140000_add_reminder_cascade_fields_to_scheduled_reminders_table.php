<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scheduled_reminders', function (Blueprint $table) {
            $table->unsignedTinyInteger('sequence')->nullable()->after('immunization_id');
            $table->unsignedSmallInteger('days_before_due')->nullable()->after('sequence');
            $table->date('dose_due_on')->nullable()->after('days_before_due');
            $table->timestamp('sent_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('scheduled_reminders', function (Blueprint $table) {
            $table->dropColumn(['sequence', 'days_before_due', 'dose_due_on', 'sent_at']);
        });
    }
};
