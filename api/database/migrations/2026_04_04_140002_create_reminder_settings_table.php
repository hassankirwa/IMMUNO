<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminder_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->nullable()->unique()->constrained('facilities')->cascadeOnDelete();
            $table->json('offset_days');
            $table->timestamps();
        });

        DB::table('reminder_settings')->insert([
            'facility_id' => null,
            'offset_days' => json_encode([10, 5, 1]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('reminder_settings');
    }
};
