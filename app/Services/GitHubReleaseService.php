<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GitHubReleaseService
{
    public function latest(): array
    {
        return $this->releases()[0] ?? throw new RuntimeException('No hay una release publicada todavía.');
    }

    public function releases(): array
    {
        $repository = config('smaf.github_repository');
        $token = config('services.github.token');

        if (blank($token)) {
            throw new RuntimeException('Configure GITHUB_TOKEN para consultar las releases privadas.');
        }

        try {
            $response = Http::acceptJson()
                ->withToken($token)
                ->timeout(10)
                ->get("https://api.github.com/repos/{$repository}/releases", [
                    'per_page' => 20,
                ]);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('No fue posible conectar con GitHub.', previous: $exception);
        }

        try {
            $response->throw();
        } catch (RequestException $exception) {
            throw new RuntimeException('GitHub rechazó la consulta de releases.', previous: $exception);
        }

        return collect($response->json())
            ->reject(fn (array $release): bool => $release['draft'] || $release['prerelease'])
            ->map(fn (array $release): array => [
                'tag' => $release['tag_name'],
                'name' => $release['name'],
                'publishedAt' => $release['published_at'],
                'url' => $release['html_url'],
                'notes' => $release['body'],
            ])
            ->values()
            ->all();
    }
}
