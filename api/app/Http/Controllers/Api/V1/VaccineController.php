<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Vaccine;
use App\Models\VaccineDoseInterval;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VaccineController extends Controller
{
    public function doseIntervals(Request $request, Vaccine $vaccine): JsonResponse
    {
        $this->authorize('view', $vaccine);

        $rows = VaccineDoseInterval::query()
            ->where('vaccine_id', $vaccine->id)
            ->orderBy('after_dose')
            ->get();

        return response()->json([
            'data' => $rows,
            'meta' => [
                'vaccine_id' => $vaccine->id,
                'total_doses' => (int) ($vaccine->total_doses ?? 1),
                'vaccine_name' => $vaccine->name,
            ],
        ]);
    }

    /**
     * Replace dose interval rules and total doses for a vaccine (EIR master schedule).
     */
    public function syncDoseIntervals(Request $request, Vaccine $vaccine): JsonResponse
    {
        $this->authorize('update', $vaccine);

        $data = $request->validate([
            'total_doses' => ['required', 'integer', 'min:1', 'max:20'],
            'intervals' => ['nullable', 'array'],
            'intervals.*.after_dose' => ['required', 'integer', 'min:1', 'max:19'],
            'intervals.*.interval_days' => ['required', 'integer', 'min:1', 'max:3650'],
        ]);

        $total = (int) $data['total_doses'];
        $intervalRows = $data['intervals'] ?? [];

        if ($total === 1) {
            if (count($intervalRows) > 0) {
                throw ValidationException::withMessages([
                    'intervals' => ['A single-dose vaccine must not define dose intervals.'],
                ]);
            }
        } else {
            $expected = $total - 1;
            if (count($intervalRows) !== $expected) {
                $lastGap = $total - 1;
                throw ValidationException::withMessages([
                    'intervals' => [
                        "Exactly {$expected} interval row(s) are required (after doses 1 through {$lastGap}).",
                    ],
                ]);
            }

            $afterDoses = array_map(fn ($row) => (int) $row['after_dose'], $intervalRows);
            if (count($afterDoses) !== count(array_unique($afterDoses))) {
                throw ValidationException::withMessages([
                    'intervals' => ['Each after_dose must appear at most once.'],
                ]);
            }

            $byAfter = collect($intervalRows)->keyBy('after_dose');
            for ($d = 1; $d < $total; $d++) {
                if (! $byAfter->has($d)) {
                    throw ValidationException::withMessages([
                        'intervals' => ["Missing interval for after_dose {$d}."],
                    ]);
                }
            }

            foreach ($intervalRows as $row) {
                if ((int) $row['after_dose'] >= $total) {
                    throw ValidationException::withMessages([
                        'intervals' => ['after_dose must be less than total_doses.'],
                    ]);
                }
            }
        }

        DB::transaction(function () use ($vaccine, $total, $intervalRows) {
            $vaccine->total_doses = $total;
            $vaccine->save();

            VaccineDoseInterval::query()->where('vaccine_id', $vaccine->id)->delete();

            foreach ($intervalRows as $row) {
                VaccineDoseInterval::query()->create([
                    'vaccine_id' => $vaccine->id,
                    'after_dose' => (int) $row['after_dose'],
                    'interval_days' => (int) $row['interval_days'],
                ]);
            }
        });

        $fresh = $vaccine->fresh();
        $rows = VaccineDoseInterval::query()
            ->where('vaccine_id', $vaccine->id)
            ->orderBy('after_dose')
            ->get();

        return response()->json([
            'data' => $rows,
            'meta' => [
                'vaccine_id' => $vaccine->id,
                'total_doses' => (int) ($fresh?->total_doses ?? $total),
                'vaccine_name' => $fresh?->name ?? $vaccine->name,
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Vaccine::class);

        $limit = min(100, max(1, (int) $request->query('limit', 100)));
        $offset = max(0, (int) $request->query('offset', 0));
        $search = trim((string) $request->query('search', ''));

        $query = Vaccine::query()->where('is_active', true)->orderBy('name');

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('code', 'like', $like);
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
        $this->authorize('create', Vaccine::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'total_doses' => ['sometimes', 'integer', 'min:1', 'max:20'],
        ]);

        $vaccine = Vaccine::create($data);

        return response()->json($vaccine, 201);
    }

    public function show(Request $request, Vaccine $vaccine): JsonResponse
    {
        $this->authorize('view', $vaccine);

        return response()->json($vaccine);
    }

    public function update(Request $request, Vaccine $vaccine): JsonResponse
    {
        $this->authorize('update', $vaccine);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'total_doses' => ['sometimes', 'integer', 'min:1', 'max:20'],
        ]);

        $vaccine->update($data);

        return response()->json($vaccine->fresh());
    }

    public function destroy(Request $request, Vaccine $vaccine): JsonResponse
    {
        $this->authorize('delete', $vaccine);
        $vaccine->delete();

        return response()->json(null, 204);
    }
}
