<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_gateway_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('sms_enabled')->default(false);
            $table->text('sms_account_sid')->nullable();
            $table->text('sms_auth_token')->nullable();
            $table->string('sms_from_number', 64)->nullable();

            $table->boolean('whatsapp_enabled')->default(false);
            $table->string('whatsapp_phone_number_id', 128)->nullable();
            $table->string('whatsapp_business_account_id', 128)->nullable();
            $table->text('whatsapp_access_token')->nullable();

            $table->boolean('email_use_custom_smtp')->default(false);
            $table->string('email_smtp_host', 255)->nullable();
            $table->unsignedSmallInteger('email_smtp_port')->nullable();
            $table->string('email_smtp_username', 255)->nullable();
            $table->text('email_smtp_password')->nullable();
            $table->string('email_smtp_encryption', 16)->nullable();
            $table->string('email_from_address', 255)->nullable();
            $table->string('email_from_name', 255)->nullable();

            $table->timestamps();
        });

        DB::table('channel_gateway_settings')->insert([
            'sms_enabled' => false,
            'whatsapp_enabled' => false,
            'email_use_custom_smtp' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_gateway_settings');
    }
};
