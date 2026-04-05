<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('administration_routes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 100);
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();
        $rows = [
            ['code' => 'IM', 'name' => 'Intramuscular', 'sort_order' => 1],
            ['code' => 'Oral', 'name' => 'Oral', 'sort_order' => 2],
            ['code' => 'SC', 'name' => 'Subcutaneous', 'sort_order' => 3],
            ['code' => 'ID', 'name' => 'Intradermal', 'sort_order' => 4],
        ];

        foreach ($rows as $row) {
            DB::table('administration_routes')->insert([
                'code' => $row['code'],
                'name' => $row['name'],
                'sort_order' => $row['sort_order'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('administration_routes');
    }
};
