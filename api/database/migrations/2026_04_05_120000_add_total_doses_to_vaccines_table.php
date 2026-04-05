<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vaccines', function (Blueprint $table) {
            $table->unsignedTinyInteger('total_doses')->default(1)->after('is_active');
        });

        $ids = DB::table('vaccines')->pluck('id');
        foreach ($ids as $id) {
            $max = DB::table('vaccine_dose_intervals')->where('vaccine_id', $id)->max('after_dose');
            $total = $max ? (int) $max + 1 : 1;
            DB::table('vaccines')->where('id', $id)->update(['total_doses' => $total]);
        }
    }

    public function down(): void
    {
        Schema::table('vaccines', function (Blueprint $table) {
            $table->dropColumn('total_doses');
        });
    }
};
