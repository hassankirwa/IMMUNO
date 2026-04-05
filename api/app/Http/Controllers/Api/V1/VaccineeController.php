<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\AppliesFacilityScope;
use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Vaccinee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VaccineeController extends Controller
{
    use AppliesFacilityScope;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Vaccinee::class);

        $limit = min(100, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));
        $search = trim((string) $request->query('search', ''));

        $query = Vaccinee::query()->with(['guardian', 'facility'])->orderBy('name');
        $query = $this->scopeByFacility($query, $request->user());

        if ($request->user()->hasRole('admin') && $request->filled('facility_id')) {
            $query->where('facility_id', (int) $request->query('facility_id'));
        }

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhereHas('guardian', function ($gq) use ($like) {
                        $gq->where('name', 'like', $like)
                            ->orWhere('phone', 'like', $like)
                            ->orWhere('email', 'like', $like);
                    });
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
        $this->authorize('create', Vaccinee::class);

        $data = $request->validate([
            'facility_id' => ['nullable', 'exists:facilities,id'],
            'guardian_id' => ['nullable', 'exists:guardians,id'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:50'],
            'date_of_birth' => ['nullable', 'date'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'external_id' => ['nullable', 'string', 'max:255'],
        ]);

        if ($request->user()->hasRole('health_officer')) {
            $data['facility_id'] = $request->user()->facility_id;
        } else {
            $data['facility_id'] = $data['facility_id'] ?? $request->user()->facility_id;
        }

        if (! $data['facility_id'] || ! $request->user()->canAccessFacility((int) $data['facility_id'])) {
            abort(403, 'Invalid facility for this user.');
        }

        if (! empty($data['guardian_id'])) {
            $g = Guardian::find($data['guardian_id']);
            if (! $g || ! $request->user()->canAccessFacility((int) $g->facility_id)) {
                abort(403, 'Guardian is not in scope.');
            }
        }

        $vaccinee = Vaccinee::create($data);

        return response()->json($vaccinee->load(['guardian', 'facility']), 201);
    }

    public function show(Request $request, Vaccinee $vaccinee): JsonResponse
    {
        $this->authorize('view', $vaccinee);

        return response()->json($vaccinee->load(['guardian', 'facility']));
    }

    public function update(Request $request, Vaccinee $vaccinee): JsonResponse
    {
        $this->authorize('update', $vaccinee);

        $data = $request->validate([
            'guardian_id' => ['nullable', 'exists:guardians,id'],
            'first_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'name' => ['sometimes', 'string', 'max:255'],
            'gender' => ['sometimes', 'nullable', 'string', 'max:50'],
            'date_of_birth' => ['sometimes', 'nullable', 'date'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'external_id' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('guardian_id', $data) && $data['guardian_id']) {
            $g = Guardian::find($data['guardian_id']);
            if (! $g || (int) $g->facility_id !== (int) $vaccinee->facility_id) {
                abort(403, 'Guardian must belong to the same facility.');
            }
        }

        $vaccinee->update($data);

        return response()->json($vaccinee->fresh()->load(['guardian', 'facility']));
    }

    public function destroy(Request $request, Vaccinee $vaccinee): JsonResponse
    {
        $this->authorize('delete', $vaccinee);
        $vaccinee->delete();

        return response()->json(null, 204);
    }
}
