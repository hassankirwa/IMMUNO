<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('channel_gateway_settings', function (Blueprint $table) {
            $table->string('sms_provider', 32)->default('africas_talking');
            $table->string('sms_environment', 16)->default('production');
        });
    }

    public function down(): void
    {
        Schema::table('channel_gateway_settings', function (Blueprint $table) {
            $table->dropColumn(['sms_provider', 'sms_environment']);
        });
    }
};
