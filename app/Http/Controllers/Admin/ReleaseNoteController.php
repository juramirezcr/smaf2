<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReleaseNote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ReleaseNoteController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'version' => 'required|string|max:50',
            'notes' => 'required|string',
        ]);

        ReleaseNote::create($validated);

        return back();
    }

    public function update(Request $request, ReleaseNote $releaseNote): RedirectResponse
    {
        $validated = $request->validate([
            'version' => 'required|string|max:50',
            'notes' => 'required|string',
        ]);

        $releaseNote->update($validated);

        return back();
    }

    public function destroy(ReleaseNote $releaseNote): RedirectResponse
    {
        $releaseNote->delete();

        return back();
    }
}
