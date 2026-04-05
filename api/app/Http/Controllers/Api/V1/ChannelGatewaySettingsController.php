<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ChannelGatewaySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChannelGatewaySettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasRole('admin'), 403);

        $row = ChannelGatewaySetting::singleton();

        return response()->json($this->toMaskedArray($row));
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasRole('admin'), 403);

        $data = $request->validate([
            'sms_enabled' => ['sometimes', 'boolean'],
            'sms_provider' => ['sometimes', 'string', 'in:africas_talking,twilio'],
            'sms_environment' => ['sometimes', 'string', 'in:sandbox,production'],
            'sms_account_sid' => ['nullable', 'string', 'max:255'],
            'sms_auth_token' => ['nullable', 'string', 'max:2048'],
            'sms_from_number' => ['nullable', 'string', 'max:64'],

            'whatsapp_enabled' => ['sometimes', 'boolean'],
            'whatsapp_phone_number_id' => ['nullable', 'string', 'max:128'],
            'whatsapp_business_account_id' => ['nullable', 'string', 'max:128'],
            'whatsapp_access_token' => ['nullable', 'string', 'max:4096'],

            'email_use_custom_smtp' => ['sometimes', 'boolean'],
            'email_smtp_host' => ['nullable', 'string', 'max:255'],
            'email_smtp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'email_smtp_username' => ['nullable', 'string', 'max:255'],
            'email_smtp_password' => ['nullable', 'string', 'max:2048'],
            'email_smtp_encryption' => ['nullable', 'string', 'in:tls,ssl'],
            'email_from_address' => ['nullable', 'string', 'max:255'],
            'email_from_name' => ['nullable', 'string', 'max:255'],
        ]);

        $row = ChannelGatewaySetting::singleton();

        foreach (['sms_enabled', 'whatsapp_enabled', 'email_use_custom_smtp'] as $boolKey) {
            if (array_key_exists($boolKey, $data)) {
                $row->{$boolKey} = $data[$boolKey];
            }
        }

        foreach (['sms_provider', 'sms_environment', 'sms_from_number', 'whatsapp_phone_number_id', 'whatsapp_business_account_id', 'email_smtp_host', 'email_smtp_port', 'email_smtp_username', 'email_smtp_encryption', 'email_from_address', 'email_from_name'] as $key) {
            if (array_key_exists($key, $data)) {
                $val = $data[$key];
                if ($key === 'email_smtp_encryption' && ($val === 'null' || $val === '' || $val === null)) {
                    $row->{$key} = null;
                } else {
                    $row->{$key} = $val;
                }
            }
        }

        if (! empty($data['sms_account_sid'] ?? null)) {
            $row->sms_account_sid = $data['sms_account_sid'];
        }
        if (! empty($data['sms_auth_token'] ?? null)) {
            $row->sms_auth_token = $data['sms_auth_token'];
        }
        if (! empty($data['whatsapp_access_token'] ?? null)) {
            $row->whatsapp_access_token = $data['whatsapp_access_token'];
        }
        if (! empty($data['email_smtp_password'] ?? null)) {
            $row->email_smtp_password = $data['email_smtp_password'];
        }

        $row->save();

        return response()->json($this->toMaskedArray($row->fresh()));
    }

    /**
     * @return array<string, mixed>
     */
    private function toMaskedArray(ChannelGatewaySetting $row): array
    {
        return [
            'sms' => [
                'provider' => $row->sms_provider ?? 'africas_talking',
                'environment' => $row->sms_environment ?? 'production',
                'enabled' => (bool) $row->sms_enabled,
                /** Africa's Talking: app username; Twilio: Account SID (same DB column). */
                'username' => $this->maskIdentifier($row->sms_account_sid),
                'api_key_configured' => $this->isFilled($row->sms_auth_token),
                /** Sender ID (AT) or From number (Twilio E.164). */
                'sender_id' => $row->sms_from_number,
            ],
            'whatsapp' => [
                'enabled' => (bool) $row->whatsapp_enabled,
                'phone_number_id' => $row->whatsapp_phone_number_id,
                'business_account_id' => $row->whatsapp_business_account_id,
                'access_token_configured' => $this->isFilled($row->whatsapp_access_token),
            ],
            'email' => [
                'use_custom_smtp' => (bool) $row->email_use_custom_smtp,
                'smtp_host' => $row->email_smtp_host,
                'smtp_port' => $row->email_smtp_port,
                'smtp_username' => $row->email_smtp_username,
                'smtp_password_configured' => $this->isFilled($row->email_smtp_password),
                'smtp_encryption' => $row->email_smtp_encryption,
                'from_address' => $row->email_from_address,
                'from_name' => $row->email_from_name,
            ],
        ];
    }

    private function maskIdentifier(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $len = strlen($value);
        if ($len <= 4) {
            return '••••';
        }

        return str_repeat('•', $len - 4).substr($value, -4);
    }

    private function isFilled(?string $value): bool
    {
        return $value !== null && $value !== '';
    }
}
