<?php

namespace App\Services;

use App\Models\ChannelGatewaySetting;
use Illuminate\Support\Facades\Http;

/**
 * Sends SMS via Africa's Talking HTTP API.
 *
 * Dashboard setup (see https://africastalking.com and developer docs):
 * - Application **username** (created with your app)
 * - **API key** from Settings → API Key (wait a few minutes after generating)
 * - **Sender ID** — registered alphanumeric or short code (SMS section of the dashboard)
 *
 * Endpoint: POST {sandbox|api}.africastalking.com/version1/messaging
 * Auth: request header `apiKey` + form fields `username`, `to`, `message`, optional `from`.
 */
class AfricasTalkingSmsService
{
    public function send(string $to, string $message, ?string $from = null): \Illuminate\Http\Client\Response
    {
        $row = ChannelGatewaySetting::singleton();

        if (! $row->sms_enabled || ($row->sms_provider ?? 'africas_talking') !== 'africas_talking') {
            throw new \RuntimeException('Africa\'s Talking SMS is not enabled or not selected.');
        }

        $username = $row->sms_account_sid;
        $apiKey = $row->sms_auth_token;
        if ($username === null || $username === '' || $apiKey === null || $apiKey === '') {
            throw new \RuntimeException('Africa\'s Talking username and API key must be configured.');
        }

        $base = ($row->sms_environment ?? 'production') === 'sandbox'
            ? 'https://api.sandbox.africastalking.com'
            : 'https://api.africastalking.com';

        $sender = $from ?? $row->sms_from_number;

        $payload = [
            'username' => $username,
            'to' => $to,
            'message' => $message,
        ];
        if ($sender !== null && $sender !== '') {
            $payload['from'] = $sender;
        }

        return Http::withHeaders([
            'Accept' => 'application/json',
            'apiKey' => $apiKey,
        ])
            ->asForm()
            ->timeout(30)
            ->post("{$base}/version1/messaging", $payload);
    }
}
