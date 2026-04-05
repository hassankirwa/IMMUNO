<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('reminder_message_templates')->insert([
            'facility_id' => null,
            'name' => 'Default SMS',
            'body_template' => '[{reminder_ordinal}] {offset_days} days before due: Hello {patient_name}, your {vaccine_name} dose is due on {dose_due_date}. Reminder from {facility_name}.',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('reminder_message_templates')
            ->where('name', 'Default SMS')
            ->whereNull('facility_id')
            ->delete();
    }
};
