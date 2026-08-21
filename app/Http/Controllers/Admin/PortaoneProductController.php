<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\PortaoneProduct;
use App\Services\PortaOneClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class PortaoneProductController extends Controller
{
    public function index(Client $client): Response
    {
        return Inertia::render('Admin/PortaoneProducts', [
            'client' => ['id' => $client->id, 'name' => $client->name],
            'products' => PortaoneProduct::query()
                ->where('client_id', $client->id)
                ->orderBy('name')
                ->get(['id', 'i_product', 'name', 'end_user_name', 'is_telephony', 'synced_at']),
        ]);
    }

    public function refresh(Client $client): RedirectResponse
    {
        try {
            $products = (new PortaOneClient($client))->fetchProducts();
        } catch (RuntimeException $exception) {
            return back()->withErrors(['products' => $exception->getMessage()]);
        }

        foreach ($products as $product) {
            if (! isset($product['i_product'])) {
                continue;
            }

            PortaoneProduct::updateOrCreate(
                ['client_id' => $client->id, 'i_product' => (int) $product['i_product']],
                [
                    'name' => $product['name'] ?? '',
                    'end_user_name' => $product['end_user_name'] ?? null,
                    'synced_at' => now(),
                ],
            );
        }

        return back();
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $validated = $request->validate([
            'telephony_ids' => ['array'],
            'telephony_ids.*' => ['integer'],
        ]);

        $telephonyIds = $validated['telephony_ids'] ?? [];

        PortaoneProduct::query()->where('client_id', $client->id)->update(['is_telephony' => false]);

        if ($telephonyIds !== []) {
            PortaoneProduct::query()
                ->where('client_id', $client->id)
                ->whereIn('id', $telephonyIds)
                ->update(['is_telephony' => true]);
        }

        return back();
    }
}
