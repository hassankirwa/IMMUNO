<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\AppliesFacilityScope;
use App\Http\Controllers\Controller;
use App\Models\Guardian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuardianController extends Controller
{
    use AppliesFacilityScope;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Guardian::class);

        $limit = min(100, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));
        $search = trim((string) $request->query('search', ''));

        $query = Guardian::query()->with('facility')->orderBy('name');
        $query = $this->scopeByFacility($query, $request->user());

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('email', 'like', $like);
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
        $this->authorize('create', Guardian::class);

        $data = $request->validate([
            'facility_id' => ['nullable', 'exists:facilities,id'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        if ($request->user()->hasRole('health_officer')) {
            $data['facility_id'] = $request->user()->facility_id;
        } else {
            $data['facility_id'] = $data['facility_id'] ?? $request->user()->facility_id;
        }

        if (! $data['facility_id'] || ! $request->user()->canAccessFacility((int) $data['facility_id'])) {
            abort(403, 'Invalid facility for this user.');
        }

        $guardian = Guardian::create($data);

        return response()->json($guardian->load('facility'), 201);
    }

    public function show(Request $request, Guardian $guardian): JsonResponse
    {
        $this->authorize('view', $guardian);

        return response()->json($guardian->load('facility'));
    }

    public function update(Request $request, Guardian $guardian): JsonResponse
    {
        $this->authorize('update', $guardian);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $guardian->update($data);

        return response()->json($guardian->fresh()->load('facility'));
    }

    public function destroy(Request $request, Guardian $guardian): JsonResponse
    {
        $this->authorize('delete', $guardian);
        $guardian->delete();

        return response()->json(null, 204);
    }
}
