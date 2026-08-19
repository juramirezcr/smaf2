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
        $repository = config('smaf.github_repository');
        $token = config('services.github.token');

        if (blank($token)) {
            throw new RuntimeException('Configure GITHUB_TOKEN para consultar las releases privadas.');
        }

        try {
            $response = Http::acceptJson()
                ->withToken($token)
                ->timeout(10)
                ->get("https://api.github.com/repos/{$repository}/releases/latest");
        } catch (ConnectionException $exception) {
            throw new RuntimeException('No fue posible conectar con GitHub.', previous: $exception);
        }

        if ($response->status() === 404) {
            throw new RuntimeException('No hay una release publicada todavía.');
        }

        try {
            $response->throw();
        } catch (RequestException $exception) {
            throw new RuntimeException('GitHub rechazó la consulta de releases.', previous: $exception);
        }

        return [
            'tag' => $response->json('tag_name'),
            'name' => $response->json('name'),
            'publishedAt' => $response->json('published_at'),
            'url' => $response->json('html_url'),
        ];
    }
}
