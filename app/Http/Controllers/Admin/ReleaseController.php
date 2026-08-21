<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\GitHubReleaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ReleaseController extends Controller
{
    public function index(Request $request, GitHubReleaseService $releases): Response
    {
        $this->ensureAdmin($request);

        $latest = null;
        $history = [];
        $error = null;

        try {
            $history = $releases->releases();
            $latest = $history[0] ?? null;
        } catch (RuntimeException $exception) {
            $error = $exception->getMessage();
        }

        $deployRun = null;
        $deployError = null;

        try {
            $deployRun = $releases->latestDeployRun();
        } catch (RuntimeException $exception) {
            $deployError = $exception->getMessage();
        }

        return Inertia::render('Admin/Releases', [
            'currentVersion' => config('smaf.version'),
            'repository' => config('smaf.github_repository'),
            'latest' => $latest,
            'history' => $history,
            'error' => $error,
            'deployRun' => $deployRun,
            'deployError' => $deployError,
        ]);
    }

    public function deploy(Request $request, GitHubReleaseService $releases): RedirectResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'tag' => 'required|string',
        ]);

        try {
            $availableTags = collect($releases->releases())->pluck('tag');
        } catch (RuntimeException $exception) {
            return back()->withErrors(['tag' => $exception->getMessage()]);
        }

        if (! $availableTags->contains($validated['tag'])) {
            return back()->withErrors(['tag' => 'La versión seleccionada no está en el historial de releases.']);
        }

        try {
            $releases->triggerDeploy($validated['tag']);
        } catch (RuntimeException $exception) {
            return back()->withErrors(['tag' => $exception->getMessage()]);
        }

        return back();
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()->email === config('smaf.admin_email'), 403);
    }
}
