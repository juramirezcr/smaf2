<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\GitHubReleaseService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ReleaseController extends Controller
{
    public function __invoke(Request $request, GitHubReleaseService $releases): Response
    {
        abort_unless($request->user()->email === config('smaf.admin_email'), 403);

        $latest = null;
        $error = null;

        try {
            $latest = $releases->latest();
        } catch (RuntimeException $exception) {
            $error = $exception->getMessage();
        }

        return Inertia::render('Admin/Releases', [
            'currentVersion' => config('smaf.version'),
            'repository' => config('smaf.github_repository'),
            'latest' => $latest,
            'error' => $error,
        ]);
    }
}
