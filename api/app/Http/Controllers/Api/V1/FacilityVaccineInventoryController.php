<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\AppliesFacilityScope;
use App\Http\Controllers\Controller;
use App\Models\FacilityVaccineInventory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityVaccineInventoryController extends Controller
{
    use AppliesFacilityScope;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', FacilityVaccineInventory::class);

        $limit = min(100, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));
        $facilityId = $request->query('facility_id');

        $query = FacilityVaccineInventory::query()->with(['facility', 'vaccine'])->orderBy('expiry_date');

        $query = $this->scopeByFacility($query, $request->user());

        if ($facilityId !== null && $facilityId !== '' && $request->user()->hasRole('admin')) {
            $query->where('facility_id', (int) $facilityId);
        }

        $total = (clone $query)->count();
        $rows = $query->skip($offset)->take($limit)->get();

        return response()->json([
            'data' => $rows,
            'meta' => ['total' => $total, 'limit' => $limit, 'offset' => $offset],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', FacilityVaccineInventory::class);

        $data = $request->validate([
            'facility_id' => ['nullable', 'exists:facilities,id'],
            'vaccine_id' => ['required', 'exists:vaccines,id'],
            'quantity_on_hand' => ['sometimes', 'integer', 'min:0'],
            'batch_number' => ['nullable', 'string', 'max:255'],
            'expiry_date' => ['nullable', 'date'],
            'reorder_threshold' => ['nullable', 'integer', 'min:0'],
        ]);

        if ($request->user()->hasRole('health_officer')) {
            $data['facility_id'] = $request->user()->facility_id;
        } else {
            $data['facility_id'] = $data['facility_id'] ?? $request->user()->facility_id;
        }

        if (! $data['facility_id'] || ! $request->user()->canAccessFacility((int) $data['facility_id'])) {
            abort(403, 'Invalid facility for this user.');
        }

        $row = FacilityVaccineInventory::create($data);

        return response()->json($row->load(['facility', 'vaccine']), 201);
    }

    public function show(Request $request, FacilityVaccineInventory $inventory): JsonResponse
    {
        $this->authorize('view', $inventory);

        return response()->json($inventory->load(['facility', 'vaccine']));
    }

    public function update(Request $request, FacilityVaccineInventory $inventory): JsonResponse
    {
        $this->authorize('update', $inventory);

        $data = $request->validate([
            'quantity_on_hand' => ['sometimes', 'integer', 'min:0'],
            'batch_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'expiry_date' => ['sometimes', 'nullable', 'date'],
            'reorder_threshold' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ]);

        $inventory->update($data);

        return response()->json($inventory->fresh()->load(['facility', 'vaccine']));
    }

    public function destroy(Request $request, FacilityVaccineInventory $inventory): JsonResponse
    {
        $this->authorize('delete', $inventory);
        $inventory->delete();

        return response()->json(null, 204);
    }
}
