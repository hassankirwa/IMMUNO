<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\AppliesFacilityScope;
use App\Http\Controllers\Controller;
use App\Models\Immunization;
use App\Models\ScheduledReminder;
use App\Models\Vaccinee;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    use AppliesFacilityScope;

    public function __invoke(Request $request): JsonResponse
    {
        if (! $request->user()->can('stats.view')) {
            abort(403);
        }

        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();

        $vaccineeQ = Vaccinee::query();
        $vaccineeQ = $this->scopeByFacility($vaccineeQ, $request->user());

        $immQ = Immunization::query();
        $immQ = $this->scopeByFacility($immQ, $request->user());

        $remQ = ScheduledReminder::query();
        $remQ = $this->scopeByFacility($remQ, $request->user());

        $totalPatients = (clone $vaccineeQ)->count();

        $vaccinationsToday = (clone $immQ)
            ->whereDate('date_administered', $today)
            ->count();

        $upcomingReminders = (clone $remQ)
            ->where('status', 'pending')
            ->whereNotNull('due_at')
            ->where('due_at', '>=', Carbon::now())
            ->count();

        $overdueVaccinations = (clone $immQ)
            ->whereNotNull('next_due_date')
            ->where('next_due_date', '<', $today)
            ->whereIn('status', ['scheduled', 'pending', 'overdue'])
            ->count();

        $completedThisMonth = (clone $immQ)
            ->where('status', 'completed')
            ->whereBetween('date_administered', [$startOfMonth, Carbon::now()])
            ->count();

        $pendingFollowUps = (clone $immQ)
            ->where('followup_scheduled', true)
            ->whereIn('status', ['completed', 'scheduled'])
            ->count();

        return response()->json([
            'totalPatients' => $totalPatients,
            'vaccinationsToday' => $vaccinationsToday,
            'upcomingReminders' => $upcomingReminders,
            'overdueVaccinations' => $overdueVaccinations,
            'completedThisMonth' => $completedThisMonth,
            'pendingFollowUps' => $pendingFollowUps,
        ]);
    }
}
