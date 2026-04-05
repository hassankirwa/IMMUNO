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
        Schema::table('immunizations', function (Blueprint $table) {
            $table->foreignId('facility_vaccine_inventory_id')
                ->nullable()
                ->after('facility_id')
                ->constrained('facility_vaccine_inventory')
                ->nullOnDelete();
            $table->string('vial_barcode')->nullable()->after('batch_number');
            $table->date('expiry_date')->nullable()->after('vial_barcode');
            $table->boolean('vvm_confirmed')->default(false)->after('expiry_date');

            $table->index('facility_vaccine_inventory_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('immunizations', function (Blueprint $table) {
            $table->dropForeign(['facility_vaccine_inventory_id']);
            $table->dropColumn([
                'facility_vaccine_inventory_id',
                'vial_barcode',
                'expiry_date',
                'vvm_confirmed',
            ]);
        });
    }
};
