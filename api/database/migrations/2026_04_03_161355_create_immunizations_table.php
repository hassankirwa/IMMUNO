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
        Schema::create('immunizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vaccinee_id')->constrained('vaccinees')->cascadeOnDelete();
            $table->foreignId('vaccine_id')->constrained('vaccines')->restrictOnDelete();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            $table->foreignId('administered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('batch_number')->nullable();
            $table->date('date_administered')->nullable();
            $table->unsignedTinyInteger('dose_number')->nullable();
            $table->unsignedTinyInteger('total_doses_required')->nullable();
            $table->string('route')->nullable();
            $table->date('next_due_date')->nullable();
            $table->boolean('followup_scheduled')->default(false);
            $table->text('notes')->nullable();
            $table->string('status')->default('completed');
            $table->string('external_id')->nullable()->index();
            $table->timestamps();

            $table->index('facility_id');
            $table->index('date_administered');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('immunizations');
    }
};
