<?php

namespace App\Services;

class ReminderMessageRenderer
{
    /**
     * @param  array<string, string|int|float>  $vars
     */
    public static function render(string $template, array $vars): string
    {
        $out = $template;
        foreach ($vars as $key => $value) {
            $out = str_replace('{'.$key.'}', (string) $value, $out);
        }

        return $out;
    }

    public static function ordinal(int $n): string
    {
        $suffix = 'th';
        $mod100 = $n % 100;
        if ($mod100 < 11 || $mod100 > 13) {
            $suffix = match ($n % 10) {
                1 => 'st',
                2 => 'nd',
                3 => 'rd',
                default => 'th',
            };
        }

        return $n.$suffix;
    }
}
