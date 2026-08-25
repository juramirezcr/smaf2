<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ProcessRun;
use Inertia\Inertia;
use Inertia\Response;

class ProcessRunController extends Controller
{
    public function index(): Response
    {
        $clientNames = Client::query()->pluck('name', 'id');

        $runs = ProcessRun::query()
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $runs->getCollection()->transform(function (ProcessRun $run) use ($clientNames) {
            $run->client_name = $clientNames->get($run->client_id);

            return $run;
        });

        return Inertia::render('ProcessRuns/Index', [
            'runs' => $runs,
        ]);
    }
}
