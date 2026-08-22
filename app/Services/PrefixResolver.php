<?php

namespace App\Services;

use App\Models\CountryPrefix;
use Illuminate\Support\Facades\Cache;

class PrefixResolver
{
    private static array $prefixCache = [];

    public static function resolve(string $phoneNumber): ?array
    {
        if (empty($phoneNumber)) {
            return null;
        }

        $cleanNumber = preg_replace('/[^\d+]/', '', $phoneNumber);
        $cleanNumber = ltrim($cleanNumber, '+');

        if (self::$prefixCache === []) {
            self::loadPrefixCache();
        }

        // Try to match longest prefix first
        for ($length = min(4, strlen($cleanNumber)); $length > 0; $length--) {
            $prefix = substr($cleanNumber, 0, $length);
            if (isset(self::$prefixCache[$prefix])) {
                return self::$prefixCache[$prefix];
            }
        }

        return null;
    }

    private static function loadPrefixCache(): void
    {
        self::$prefixCache = Cache::rememberForever('country_prefixes', function () {
            return CountryPrefix::all()
                ->keyBy('prefix')
                ->map(fn ($item) => [
                    'prefix' => $item->prefix,
                    'country_code' => $item->country_code,
                    'country_name' => $item->country_name,
                ])
                ->toArray();
        });
    }

    public static function clearCache(): void
    {
        Cache::forget('country_prefixes');
        self::$prefixCache = [];
    }
}
