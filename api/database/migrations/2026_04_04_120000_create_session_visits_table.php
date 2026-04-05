<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            $table->foreignId('vaccinee_id')->constrained('vaccinees')->cascadeOnDelete();
            $table->date('session_date');
            $table->string('status')->default('checked_in');
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamps();

            $table->unique(['facility_id', 'vaccinee_id', 'session_date']);
            $table->index(['facility_id', 'session_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_visits');
    }
};
