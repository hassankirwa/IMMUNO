<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('immunizations', function (Blueprint $table) {
            $table->string('outcome', 32)->default('administered')->after('status');
            $table->string('injection_site', 100)->nullable()->after('outcome');
        });
    }

    public function down(): void
    {
        Schema::table('immunizations', function (Blueprint $table) {
            $table->dropColumn(['outcome', 'injection_site']);
        });
    }
};
