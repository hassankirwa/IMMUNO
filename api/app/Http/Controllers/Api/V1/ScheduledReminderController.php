<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\AppliesFacilityScope;
use App\Http\Controllers\Controller;
use App\Models\ScheduledReminder;
use App\Models\Vaccinee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduledReminderController extends Controller
{
    use AppliesFacilityScope;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ScheduledReminder::class);

        $limit = min(500, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));

        $query = ScheduledReminder::query()
            ->with(['facility', 'vaccinee', 'vaccine', 'immunization'])
            ->orderByDesc('due_at')
            ->orderByDesc('id');

        $query = $this->scopeByFacility($query, $request->user());

        if ($request->user()->hasRole('health_officer') && ! $request->user()->hasRole('admin')) {
            $query->whereHas('immunization', function ($q) use ($request) {
                $q->where('administered_by', $request->user()->id);
            });
        }

        if ($request->user()->hasRole('admin') && $request->filled('facility_id')) {
            $query->where('facility_id', (int) $request->query('facility_id'));
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
        $this->authorize('create', ScheduledReminder::class);

        $data = $request->validate([
            'facility_id' => ['nullable', 'exists:facilities,id'],
            'vaccinee_id' => ['required', 'exists:vaccinees,id'],
            'vaccine_id' => ['nullable', 'exists:vaccines,id'],
            'due_at' => ['nullable', 'date'],
            'channel' => ['sometimes', 'string', 'max:50'],
            'status' => ['sometimes', 'string', 'max:50'],
            'message' => ['nullable', 'string'],
        ]);

        $vaccinee = Vaccinee::findOrFail($data['vaccinee_id']);
        $this->authorize('view', $vaccinee);

        $data['facility_id'] = $vaccinee->facility_id;

        if ($request->user()->hasRole('health_officer')) {
            if ((int) $data['facility_id'] !== (int) $request->user()->facility_id) {
                abort(403);
            }
        } elseif (! $request->user()->canAccessFacility((int) $data['facility_id'])) {
            abort(403);
        }

        $reminder = ScheduledReminder::create($data);

        return response()->json($reminder->load(['facility', 'vaccinee', 'vaccine']), 201);
    }

    public function show(Request $request, ScheduledReminder $reminder): JsonResponse
    {
        $this->authorize('view', $reminder);

        return response()->json($reminder->load(['facility', 'vaccinee', 'vaccine']));
    }

    public function update(Request $request, ScheduledReminder $reminder): JsonResponse
    {
        $this->authorize('update', $reminder);

        $data = $request->validate([
            'vaccine_id' => ['sometimes', 'nullable', 'exists:vaccines,id'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'channel' => ['sometimes', 'string', 'max:50'],
            'status' => ['sometimes', 'string', 'max:50'],
            'message' => ['sometimes', 'nullable', 'string'],
        ]);

        $reminder->update($data);

        return response()->json($reminder->fresh()->load(['facility', 'vaccinee', 'vaccine']));
    }

    public function destroy(Request $request, ScheduledReminder $reminder): JsonResponse
    {
        $this->authorize('delete', $reminder);
        $reminder->delete();

        return response()->json(null, 204);
    }
}
