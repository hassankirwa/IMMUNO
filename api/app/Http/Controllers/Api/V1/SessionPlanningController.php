<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\AppliesFacilityScope;
use App\Http\Controllers\Controller;
use App\Models\FacilityVaccineInventory;
use App\Models\Immunization;
use App\Models\ScheduledReminder;
use App\Models\SessionVisit;
use App\Models\Vaccinee;
use App\Models\Vaccine;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class SessionPlanningController extends Controller
{
    use AppliesFacilityScope;

    public function show(Request $request): JsonResponse
    {
        if (! $request->user()->can('session_planning.view')) {
            abort(403);
        }

        $validated = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'facility_id' => ['nullable', 'integer', 'exists:facilities,id'],
        ]);

        $sessionDate = isset($validated['date'])
            ? Carbon::parse($validated['date'])->startOfDay()
            : Carbon::today();

        $facilityId = $this->resolveFacilityId($request, $validated['facility_id'] ?? null);

        $reminderQuery = ScheduledReminder::query()
            ->with(['vaccinee.guardian', 'vaccine'])
            ->where('facility_id', $facilityId)
            ->where('status', 'pending')
            ->whereDate('due_at', $sessionDate);

        $reminderQuery = $this->scopeByFacility($reminderQuery, $request->user());

        /** @var Collection<int, ScheduledReminder> $reminders */
        $reminders = $reminderQuery->get();

        $scheduledVaccineeIds = $reminders->pluck('vaccinee_id')->unique()->values()->all();

        $defaulterImmunizations = $this->defaulterImmunizationsQuery($request, $facilityId, $sessionDate)->get();

        $defaulterVaccineeIds = $defaulterImmunizations->pluck('vaccinee_id')->unique()->values()->all();
        $defaulterOnlyIds = array_values(array_diff($defaulterVaccineeIds, $scheduledVaccineeIds));

        $confirmedCount = count($scheduledVaccineeIds);
        $defaulterCount = count($defaulterOnlyIds);
        $walkInEstimate = $this->walkInEstimate($facilityId, $sessionDate);

        $totalExpected = $confirmedCount + $defaulterCount + $walkInEstimate;

        $compositionDen = max(1, $confirmedCount + $defaulterCount + $walkInEstimate);
        $composition = [
            'scheduledAppointments' => round(100 * $confirmedCount / $compositionDen, 1),
            'defaulterRecovery' => round(100 * $defaulterCount / $compositionDen, 1),
            'walkInsHistorical' => round(100 * $walkInEstimate / $compositionDen, 1),
        ];

        $vaccineDemand = $this->buildVaccineDemand($reminders, $defaulterImmunizations, $defaulterOnlyIds);

        $stockSummary = $this->buildStockSummary($request, $facilityId);

        $rows = $this->buildRows(
            $reminders,
            $defaulterImmunizations,
            $defaulterOnlyIds,
            $facilityId,
            $sessionDate
        );

        return response()->json([
            'date' => $sessionDate->toDateString(),
            'facility_id' => $facilityId,
            'summary' => [
                'totalExpected' => $totalExpected,
                'confirmedAppointments' => $confirmedCount,
                'highRiskDefaulters' => $defaulterCount,
                'walkInEstimate' => $walkInEstimate,
            ],
            'composition' => $composition,
            'vaccineDemand' => $vaccineDemand,
            'stockSummary' => $stockSummary,
            'rows' => $rows,
        ]);
    }

    public function upsertVisit(Request $request): JsonResponse
    {
        if (! $request->user()->can('session_visits.update')) {
            abort(403);
        }

        $data = $request->validate([
            'vaccinee_id' => ['required', 'integer', 'exists:vaccinees,id'],
            'session_date' => ['required', 'date_format:Y-m-d'],
            'status' => ['required', 'string', 'in:checked_in,waiting'],
        ]);

        $sessionDate = Carbon::parse($data['session_date'])->startOfDay();

        $vaccinee = Vaccinee::query()->findOrFail($data['vaccinee_id']);
        if (! $request->user()->canAccessFacility((int) $vaccinee->facility_id)) {
            abort(403);
        }

        $facilityId = (int) $vaccinee->facility_id;

        $visit = SessionVisit::query()->updateOrCreate(
            [
                'facility_id' => $facilityId,
                'vaccinee_id' => $vaccinee->id,
                'session_date' => $sessionDate->toDateString(),
            ],
            [
                'status' => $data['status'],
                'checked_in_at' => now(),
            ]
        );

        return response()->json($this->serializeVisit($visit));
    }

    public function updateVisit(Request $request, SessionVisit $sessionVisit): JsonResponse
    {
        if (! $request->user()->can('session_visits.update')) {
            abort(403);
        }

        if (! $request->user()->canAccessFacility((int) $sessionVisit->facility_id)) {
            abort(403);
        }

        $sessionVisit = $this->scopeByFacility(
            SessionVisit::query()->whereKey($sessionVisit->getKey()),
            $request->user()
        )->firstOrFail();

        $data = $request->validate([
            'status' => ['required', 'string', 'in:checked_in,waiting'],
        ]);

        $sessionVisit->update([
            'status' => $data['status'],
            'checked_in_at' => $sessionVisit->checked_in_at ?? now(),
        ]);

        return response()->json($this->serializeVisit($sessionVisit->fresh()));
    }

    /** @return array<string, mixed> */
    private function serializeVisit(SessionVisit $visit): array
    {
        return [
            'id' => $visit->id,
            'facility_id' => $visit->facility_id,
            'vaccinee_id' => $visit->vaccinee_id,
            'session_date' => $visit->session_date?->toDateString(),
            'status' => $visit->status,
            'checked_in_at' => $visit->checked_in_at?->toIso8601String(),
        ];
    }

    private function resolveFacilityId(Request $request, ?int $queryFacilityId): int
    {
        if ($request->user()->hasRole('admin')) {
            if ($queryFacilityId === null) {
                abort(422, 'facility_id is required for admin users.');
            }
            if (! $request->user()->canAccessFacility($queryFacilityId)) {
                abort(403);
            }

            return $queryFacilityId;
        }

        $fid = $request->user()->facility_id;
        if ($fid === null) {
            abort(403, 'User has no facility assigned.');
        }

        return (int) $fid;
    }

    private function defaulterImmunizationsQuery(Request $request, int $facilityId, Carbon $sessionDate)
    {
        $q = Immunization::query()
            ->with(['vaccinee.guardian', 'vaccine'])
            ->where('facility_id', $facilityId)
            ->whereNotNull('next_due_date')
            ->whereIn('status', ['scheduled', 'pending', 'overdue'])
            ->whereDate('next_due_date', '<=', $sessionDate)
            ->whereRaw('DATEDIFF(?, next_due_date) BETWEEN 7 AND 30', [$sessionDate->toDateString()]);

        return $this->scopeByFacility($q, $request->user());
    }

    private function walkInEstimate(int $facilityId, Carbon $sessionDate): int
    {
        $start = $sessionDate->copy()->subWeeks(8);
        $end = $sessionDate->copy()->subDay();

        if ($end < $start) {
            return 0;
        }

        $count = Immunization::query()
            ->where('facility_id', $facilityId)
            ->whereNotNull('date_administered')
            ->whereBetween('date_administered', [$start->toDateString(), $end->toDateString()])
            ->whereRaw('WEEKDAY(date_administered) = WEEKDAY(?)', [$sessionDate->format('Y-m-d')])
            ->count();

        return (int) round($count / 8);
    }

    /**
     * @param  Collection<int, ScheduledReminder>  $reminders
     * @param  Collection<int, Immunization>  $defaulterImmunizations
     * @param  array<int>  $defaulterOnlyIds
     * @return array<int, array{vaccine_id: int, name: string, percent: float, expected_doses: int}>
     */
    private function buildVaccineDemand(
        Collection $reminders,
        Collection $defaulterImmunizations,
        array $defaulterOnlyIds
    ): array {
        $counts = [];

        foreach ($reminders as $r) {
            if ($r->vaccine_id === null) {
                continue;
            }
            $vid = (int) $r->vaccine_id;
            $counts[$vid] = ($counts[$vid] ?? 0) + 1;
        }

        $defMap = $defaulterImmunizations->groupBy('vaccinee_id');
        foreach ($defaulterOnlyIds as $vid) {
            /** @var Collection<int, Immunization>|null $rows */
            $rows = $defMap->get($vid);
            if (! $rows) {
                continue;
            }
            foreach ($rows as $imm) {
                $vaccineId = (int) $imm->vaccine_id;
                $counts[$vaccineId] = ($counts[$vaccineId] ?? 0) + 1;
            }
        }

        $totalDoses = array_sum($counts);
        if ($totalDoses === 0) {
            return [];
        }

        $vaccineIds = array_keys($counts);
        $names = Vaccine::query()->whereIn('id', $vaccineIds)->pluck('name', 'id');

        $out = [];
        foreach ($counts as $vaccineId => $n) {
            $out[] = [
                'vaccine_id' => $vaccineId,
                'name' => (string) ($names[$vaccineId] ?? 'Vaccine #'.$vaccineId),
                'expected_doses' => $n,
                'percent' => round(100 * $n / $totalDoses, 1),
            ];
        }

        usort($out, fn ($a, $b) => $b['expected_doses'] <=> $a['expected_doses']);

        return $out;
    }

    /**
     * @return array{level: string, items: array<int, array<string, mixed>>}
     */
    private function buildStockSummary(Request $request, int $facilityId): array
    {
        $q = FacilityVaccineInventory::query()
            ->with('vaccine')
            ->where('facility_id', $facilityId)
            ->orderBy('vaccine_id');

        $q = $this->scopeByFacility($q, $request->user());

        $rows = $q->get();

        $worst = 'adequate';
        $items = [];

        foreach ($rows as $inv) {
            $threshold = $inv->reorder_threshold;
            $qty = (int) $inv->quantity_on_hand;
            $level = 'adequate';
            if ($threshold !== null && $threshold > 0) {
                if ($qty <= 0) {
                    $level = 'critical';
                } elseif ($qty <= (int) ceil($threshold * 0.5)) {
                    $level = 'critical';
                } elseif ($qty <= $threshold) {
                    $level = 'low';
                }
            } elseif ($qty <= 0) {
                $level = 'critical';
            }

            if ($level === 'critical') {
                $worst = 'critical';
            } elseif ($level === 'low' && $worst !== 'critical') {
                $worst = 'low';
            }

            $items[] = [
                'vaccine_id' => $inv->vaccine_id,
                'name' => $inv->vaccine?->name,
                'quantity_on_hand' => $qty,
                'reorder_threshold' => $threshold,
                'level' => $level,
            ];
        }

        if ($rows->isEmpty()) {
            $worst = 'low';
        }

        return [
            'level' => $worst,
            'items' => $items,
        ];
    }

    /**
     * @param  Collection<int, ScheduledReminder>  $reminders
     * @param  Collection<int, Immunization>  $defaulterImmunizations
     * @param  array<int>  $defaulterOnlyIds
     * @return array<int, array<string, mixed>>
     */
    private function buildRows(
        Collection $reminders,
        Collection $defaulterImmunizations,
        array $defaulterOnlyIds,
        int $facilityId,
        Carbon $sessionDate
    ): array {
        $visits = SessionVisit::query()
            ->where('facility_id', $facilityId)
            ->whereDate('session_date', $sessionDate)
            ->get()
            ->keyBy('vaccinee_id');

        $rows = [];

        $byVaccinee = $reminders->groupBy('vaccinee_id');
        foreach ($byVaccinee as $vaccineeId => $list) {
            /** @var ScheduledReminder $first */
            $first = $list->first();
            $vaccinee = $first->vaccinee;
            $due = $list->map(function (ScheduledReminder $r) {
                $vName = $r->vaccine?->name ?? 'Due';

                return $vName;
            })->unique()->values()->all();

            $rows[] = $this->formatRow(
                (int) $vaccineeId,
                $vaccinee,
                'scheduled',
                $due,
                $visits->get((int) $vaccineeId)
            );
        }

        $defMap = $defaulterImmunizations->groupBy('vaccinee_id');
        foreach ($defaulterOnlyIds as $vaccineeId) {
            /** @var Collection<int, Immunization>|null $list */
            $list = $defMap->get($vaccineeId);
            if (! $list || $list->isEmpty()) {
                continue;
            }
            $first = $list->first();
            $vaccinee = $first->vaccinee;
            $due = $list->map(fn (Immunization $i) => $i->vaccine?->name ?? 'Due')->unique()->values()->all();

            $rows[] = $this->formatRow(
                (int) $vaccineeId,
                $vaccinee,
                'defaulter',
                $due,
                $visits->get((int) $vaccineeId)
            );
        }

        usort($rows, function ($a, $b) {
            $order = ['defaulter' => 0, 'scheduled' => 1, 'walk_in' => 2];
            $ka = $order[$a['row_kind']] ?? 9;
            $kb = $order[$b['row_kind']] ?? 9;
            if ($ka !== $kb) {
                return $ka <=> $kb;
            }

            return strcasecmp($a['child_name'] ?? '', $b['child_name'] ?? '');
        });

        return $rows;
    }

    private function formatRow(
        int $vaccineeId,
        ?Vaccinee $vaccinee,
        string $rowKind,
        array $dueVaccines,
        ?SessionVisit $visit
    ): array {
        $guardian = $vaccinee?->guardian;
        $childName = $vaccinee?->name
            ?? trim(($vaccinee?->first_name ?? '').' '.($vaccinee?->last_name ?? ''))
            ?: 'Unknown';

        $display = $rowKind;
        if ($visit) {
            $display = $visit->status === 'waiting' ? 'waiting' : 'checked_in';
        }

        return [
            'vaccinee_id' => $vaccineeId,
            'child_name' => $childName,
            'guardian_name' => $guardian?->name,
            'contact_phone' => $vaccinee?->phone ?? $guardian?->phone,
            'row_kind' => $rowKind,
            'display_status' => $display,
            'due_vaccines' => array_values($dueVaccines),
            'visit_id' => $visit?->id,
            'visit_status' => $visit?->status,
        ];
    }
}
