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
        Schema::create('scheduled_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            $table->foreignId('vaccinee_id')->constrained('vaccinees')->cascadeOnDelete();
            $table->foreignId('vaccine_id')->nullable()->constrained('vaccines')->nullOnDelete();
            $table->timestamp('due_at')->nullable();
            $table->string('channel')->default('sms');
            $table->string('status')->default('pending');
            $table->text('message')->nullable();
            $table->timestamps();

            $table->index(['facility_id', 'status']);
            $table->index('due_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scheduled_reminders');
    }
};
