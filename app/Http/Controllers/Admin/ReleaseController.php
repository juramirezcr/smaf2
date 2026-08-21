<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReleaseNote;
use App\Services\GitHubReleaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ReleaseController extends Controller
{
    public function index(GitHubReleaseService $releases): Response
    {
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
            'error' => $error,
            'deployRun' => $deployRun,
            'deployError' => $deployError,
            'releaseNotes' => ReleaseNote::latest()->get()->map(fn (ReleaseNote $note): array => [
                'id' => $note->id,
                'version' => $note->version,
                'notes' => $note->notes,
                'createdAt' => $note->created_at,
            ]),
        ]);
    }

    public function deploy(Request $request, GitHubReleaseService $releases): RedirectResponse
    {
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
}
