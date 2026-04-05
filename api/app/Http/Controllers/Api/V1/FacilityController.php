<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\AppliesFacilityScope;
use App\Http\Controllers\Controller;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityController extends Controller
{
    use AppliesFacilityScope;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Facility::class);

        $limit = min(500, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));
        $search = trim((string) $request->query('search', ''));

        $query = Facility::query()->orderBy('name');
        $query = $this->scopeByFacility($query, $request->user(), 'id');

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('address', 'like', $like)
                    ->orWhere('phone', 'like', $like);
            });
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
        $this->authorize('create', Facility::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:50'],
            'type' => ['nullable', 'string', 'max:100'],
            'frappe_customer_match' => ['nullable', 'string', 'max:255'],
            'vaccibox_device_ids' => ['nullable', 'array'],
            'vaccibox_device_ids.*' => ['string', 'max:255'],
        ]);

        $facility = Facility::create($data);

        return response()->json($facility, 201);
    }

    public function show(Request $request, Facility $facility): JsonResponse
    {
        $this->authorize('view', $facility);

        return response()->json($facility);
    }

    public function update(Request $request, Facility $facility): JsonResponse
    {
        $this->authorize('update', $facility);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'type' => ['sometimes', 'nullable', 'string', 'max:100'],
            'frappe_customer_match' => ['sometimes', 'nullable', 'string', 'max:255'],
            'vaccibox_device_ids' => ['sometimes', 'nullable', 'array'],
            'vaccibox_device_ids.*' => ['string', 'max:255'],
        ]);

        $facility->update($data);

        return response()->json($facility->fresh());
    }

    public function destroy(Request $request, Facility $facility): JsonResponse
    {
        $this->authorize('delete', $facility);
        $facility->delete();

        return response()->json(null, 204);
    }
}
