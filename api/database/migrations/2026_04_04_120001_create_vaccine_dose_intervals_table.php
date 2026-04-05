<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vaccine_dose_intervals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vaccine_id')->constrained('vaccines')->cascadeOnDelete();
            $table->unsignedSmallInteger('after_dose');
            $table->unsignedSmallInteger('interval_days');
            $table->timestamps();

            $table->unique(['vaccine_id', 'after_dose']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vaccine_dose_intervals');
    }
};
