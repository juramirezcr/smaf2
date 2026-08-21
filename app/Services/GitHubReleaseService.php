<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GitHubReleaseService
{
    private const DEPLOY_WORKFLOW = 'deploy.yml';

    public function latest(): array
    {
        return $this->releases()[0] ?? throw new RuntimeException('No hay una release publicada todavía.');
    }

    public function releases(): array
    {
        $response = $this->get('releases', ['per_page' => 20]);

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

    /**
     * Inicia el workflow protegido de despliegue para la revisión indicada.
     * No ejecuta nada localmente: GitHub Actions es quien se conecta por SSH,
     * compila la nueva imagen y valida las migraciones antes de aplicarlas.
     */
    public function triggerDeploy(string $ref): void
    {
        $repository = config('smaf.github_repository');
        $token = $this->token();

        try {
            $response = Http::acceptJson()
                ->withToken($token)
                ->timeout(10)
                ->post("https://api.github.com/repos/{$repository}/actions/workflows/".self::DEPLOY_WORKFLOW.'/dispatches', [
                    'ref' => $ref,
                ]);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('No fue posible conectar con GitHub.', previous: $exception);
        }

        try {
            $response->throw();
        } catch (RequestException $exception) {
            throw new RuntimeException(
                'GitHub rechazó iniciar el despliegue. Verifique que GITHUB_TOKEN tenga permiso de escritura en Actions.',
                previous: $exception,
            );
        }
    }

    /**
     * Estado de la ejecución más reciente del workflow de despliegue, o null
     * si nunca se ha ejecutado.
     */
    public function latestDeployRun(): ?array
    {
        $response = $this->get('actions/workflows/'.self::DEPLOY_WORKFLOW.'/runs', ['per_page' => 1]);

        $run = $response->json('workflow_runs')[0] ?? null;

        if ($run === null) {
            return null;
        }

        return [
            'status' => $run['status'],
            'conclusion' => $run['conclusion'],
            'htmlUrl' => $run['html_url'],
            'createdAt' => $run['created_at'],
            'revision' => substr($run['head_sha'], 0, 7),
        ];
    }

    private function get(string $path, array $query = []): Response
    {
        $repository = config('smaf.github_repository');
        $token = $this->token();

        try {
            $response = Http::acceptJson()
                ->withToken($token)
                ->timeout(10)
                ->get("https://api.github.com/repos/{$repository}/{$path}", $query);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('No fue posible conectar con GitHub.', previous: $exception);
        }

        try {
            $response->throw();
        } catch (RequestException $exception) {
            throw new RuntimeException('GitHub rechazó la consulta.', previous: $exception);
        }

        return $response;
    }

    private function token(): string
    {
        $token = config('services.github.token');

        if (blank($token)) {
            throw new RuntimeException('Configure GITHUB_TOKEN para consultar y desplegar releases.');
        }

        return $token;
    }
}
