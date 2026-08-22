<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ProcessRun;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProcessRunController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->client_id === null;
        $clientId = $user->client_id;

        $clientNames = $isAdmin ? Client::query()->pluck('name', 'id') : null;

        $runs = ProcessRun::query()
            ->when(! $isAdmin, fn ($query) => $query->where('client_id', $clientId))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $runs->getCollection()->transform(function (ProcessRun $run) use ($clientNames, $isAdmin) {
            $run->client_name = $isAdmin ? $clientNames->get($run->client_id) : null;

            return $run;
        });

        return Inertia::render('ProcessRuns/Index', [
            'runs' => $runs,
        ]);
    }
}
