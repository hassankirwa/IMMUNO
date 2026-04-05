<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChannelGatewaySetting extends Model
{
    protected $table = 'channel_gateway_settings';

    protected $fillable = [
        'sms_enabled',
        'sms_provider',
        'sms_environment',
        'sms_account_sid',
        'sms_auth_token',
        'sms_from_number',
        'whatsapp_enabled',
        'whatsapp_phone_number_id',
        'whatsapp_business_account_id',
        'whatsapp_access_token',
        'email_use_custom_smtp',
        'email_smtp_host',
        'email_smtp_port',
        'email_smtp_username',
        'email_smtp_password',
        'email_smtp_encryption',
        'email_from_address',
        'email_from_name',
    ];

    protected function casts(): array
    {
        return [
            'sms_enabled' => 'boolean',
            'whatsapp_enabled' => 'boolean',
            'email_use_custom_smtp' => 'boolean',
            'email_smtp_port' => 'integer',
            'sms_account_sid' => 'encrypted',
            'sms_auth_token' => 'encrypted',
            'whatsapp_access_token' => 'encrypted',
            'email_smtp_password' => 'encrypted',
        ];
    }

    public static function singleton(): self
    {
        return static::query()->firstOrFail();
    }
}
